// Turns raw 1C ledger entries touching cash/bank accounts into cash-flow rows.
// Kept free of the database so the classification is easy to test and to tune: the sync agent
// on the factory PC sends raw account codes, and everything that depends on the chart of
// accounts lives here on the server.
//
// The factory's 1C uses the Russian-style chart (62 = customers, as in the debt sync).

import type { CashCategory, CashChannel, CashDirection } from "@prisma/client";

/** One ledger entry as the agent sends it. */
export interface CashFlowRecord {
  date: string;            // "2026-10-22"
  docRef: string;          // 1C presentation of the document, e.g. "Приходный кассовый ордер СС000001 от 22.10.2026"
  debitAccount: string;    // account code, e.g. "50.01"
  creditAccount: string;   // e.g. "62.01"
  amount: number;
  debitName?: string;      // first subconto of the debit side (counterparty, expense item, ...)
  debitInn?: string;
  creditName?: string;
  creditInn?: string;
  purpose?: string;
}

export interface CashFlowRow {
  externalId: string;
  date: string;
  direction: CashDirection;
  channel: CashChannel;
  category: CashCategory;
  amount: number;
  counterparty: string | null;
  counterpartyInn: string | null;
  debitAccount: string;
  creditAccount: string;
  docRef: string;
  purpose: string | null;
}

// Account prefixes, compared without dots ("50.01" → "5001").
const CASH_ACCOUNTS = ["50"];            // kassa
const BANK_ACCOUNTS = ["51", "52"];      // hisob raqam, valyuta hisobi
const TRANSIT_ACCOUNTS = ["55", "57"];   // money in transit between cash and bank — not a real in/out

const CUSTOMER_ACCOUNTS = ["62"];
const SUPPLIER_ACCOUNTS = ["60"];
const PAYROLL_ACCOUNTS = ["70"];
const TAX_ACCOUNTS = ["68", "69"];
const EXPENSE_ACCOUNTS = ["20", "23", "25", "26", "44", "71", "91"];

const code = (account: string) => account.replace(/\./g, "").trim();
const startsWithAny = (account: string, prefixes: string[]) => prefixes.some((p) => code(account).startsWith(p));

export const isCashAccount = (a: string) => startsWithAny(a, CASH_ACCOUNTS);
export const isBankAccount = (a: string) => startsWithAny(a, BANK_ACCOUNTS);
const isMoneyAccount = (a: string) => isCashAccount(a) || isBankAccount(a) || startsWithAny(a, TRANSIT_ACCOUNTS);

/** What the money was for, judged by the account on the other side of the entry. */
export function categoryOf(direction: CashDirection, otherAccount: string): CashCategory {
  if (startsWithAny(otherAccount, CUSTOMER_ACCOUNTS)) return "CUSTOMER";
  if (direction === "IN") return "OTHER";
  if (startsWithAny(otherAccount, SUPPLIER_ACCOUNTS)) return "SUPPLIER";
  if (startsWithAny(otherAccount, PAYROLL_ACCOUNTS)) return "PAYROLL";
  if (startsWithAny(otherAccount, TAX_ACCOUNTS)) return "TAX";
  if (startsWithAny(otherAccount, EXPENSE_ACCOUNTS)) return "EXPENSE";
  return "OTHER";
}

const clean = (s?: string) => (s ?? "").trim();

/**
 * Identity of a ledger line. Built from both sides of the entry, exactly as the agent groups
 * lines before batching (sync-agent/src/transform.js), so one key never spans two batches.
 */
export function cashFlowKey(r: CashFlowRecord): string {
  const side = (inn?: string, name?: string) => clean(inn) || clean(name);
  return `1C:${clean(r.docRef)}|${code(r.debitAccount)}|${code(r.creditAccount)}|${side(r.debitInn, r.debitName)}|${side(r.creditInn, r.creditName)}`;
}

/**
 * Classify one entry. Returns null for entries that are not real cash movements:
 * cash ↔ bank transfers, anything in transit, or entries that do not touch cash/bank at all.
 */
export function toCashFlowRow(r: CashFlowRecord): CashFlowRow | null {
  if (!(r.amount > 0) || !r.docRef) return null;
  const debitIsMoney = isCashAccount(r.debitAccount) || isBankAccount(r.debitAccount);
  const creditIsMoney = isCashAccount(r.creditAccount) || isBankAccount(r.creditAccount);

  // Exactly one side is cash/bank, and the other side is not a transit account.
  if (debitIsMoney === creditIsMoney) return null;
  const direction: CashDirection = debitIsMoney ? "IN" : "OUT";
  const moneyAccount = debitIsMoney ? r.debitAccount : r.creditAccount;
  const otherAccount = debitIsMoney ? r.creditAccount : r.debitAccount;
  if (isMoneyAccount(otherAccount)) return null;

  const counterparty = clean(debitIsMoney ? r.creditName : r.debitName) || null;
  const counterpartyInn = clean(debitIsMoney ? r.creditInn : r.debitInn) || null;

  return {
    externalId: cashFlowKey(r),
    date: r.date,
    direction,
    channel: isCashAccount(moneyAccount) ? "CASH" : "BANK",
    category: categoryOf(direction, otherAccount),
    amount: Math.round(r.amount * 100) / 100,
    counterparty,
    counterpartyInn,
    debitAccount: clean(r.debitAccount),
    creditAccount: clean(r.creditAccount),
    docRef: clean(r.docRef),
    purpose: clean(r.purpose) || null,
  };
}

/**
 * Classify a batch. Entries of one document that map to the same row (a document with
 * several lines for the same counterparty and accounts) are summed into one.
 */
export function toCashFlowRows(records: CashFlowRecord[]): { rows: CashFlowRow[]; skipped: number } {
  const byId = new Map<string, CashFlowRow>();
  let skipped = 0;
  for (const rec of records) {
    const row = toCashFlowRow(rec);
    if (!row) { skipped++; continue; }
    const prev = byId.get(row.externalId);
    if (prev) prev.amount = Math.round((prev.amount + row.amount) * 100) / 100;
    else byId.set(row.externalId, row);
  }
  return { rows: [...byId.values()], skipped };
}

export const CATEGORY_LABELS: Record<CashCategory, string> = {
  CUSTOMER: "Mijozlar bilan hisob-kitob",
  SUPPLIER: "Yetkazib beruvchilarga",
  PAYROLL: "Ish haqi",
  TAX: "Soliq va to'lovlar",
  EXPENSE: "Xarajatlar",
  OTHER: "Boshqa",
};

export const CHANNEL_LABELS: Record<CashChannel, string> = {
  CASH: "Kassa (naqd)",
  BANK: "Bank",
};

/** A customer entry is a payment when money comes in and a refund when it goes out. */
export function categoryLabel(direction: CashDirection, category: CashCategory): string {
  if (category === "CUSTOMER") return direction === "IN" ? "Mijozlardan to'lov" : "Mijozga qaytarilgan";
  return CATEGORY_LABELS[category];
}
