import { db } from "@/lib/db";
import { detectProvince } from "@/lib/provinces";
import { pickAutoMerge, type MatchIndex, type MatchResult, type MatchTarget } from "@/lib/clients/matching";
import { loadMergeableIndex, loadRejectedPairs } from "@/services/crm/client-merge.service";
import { toCashFlowRows, type CashFlowRecord } from "@/lib/sync/cashflow";
import { sameAmount } from "@/lib/sync/onec-status";
import type { OneCChangeKind } from "@prisma/client";

// ─── Public interfaces (used by API route and sync agent) ─────────────────────

export interface SaleRecord {
  date: string;       // ISO date, e.g. "2026-06-01"
  number: string;     // 1C doc number, e.g. "SS000000515"
  amount: number;     // total in UZS
  clientName: string;
  inn: string;        // INN / PINFL
  phone?: string;
  contract: string;
  comment: string;    // salesperson or region
}

export interface DebtInvoice {
  date: string;
  number: string;
  amount: number;
}

export interface DebtRecord {
  clientName: string;
  inn: string;
  phone?: string;
  region?: string;    // from counterpart comment field
  totalDebt: number;  // account 62 balance
  invoices?: DebtInvoice[]; // for aging calculation
}

export interface SyncPayload {
  sales?: SaleRecord[];
  debts?: DebtRecord[];
  /** Cash and bank ledger entries (kirim/chiqim), see lib/sync/cashflow.ts. */
  cashFlows?: CashFlowRecord[];
  /**
   * Set on the last batch when the agent read the whole cash ledger from this date on:
   * mirrored rows from that date that the run did not send are gone from 1C.
   */
  cashFrom?: string;
  agentVersion?: string;
  /** Same id on every batch of one agent run. */
  runId?: string;
  /** Set on the last batch: every debtor of the run has been sent, the rest are paid off. */
  final?: boolean;
}

export interface SyncResult {
  salesSynced: number;
  debtsSynced: number;
  cashFlowsSynced: number;
  cashFlowsSkipped: number;
  clientsCreated: number;
  clientsUpdated: number;
  errors: string[];
  durationMs: number;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function genId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizePhone(phone?: string): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "");
  if (d.length === 9)  return `+998${d}`;
  if (d.length === 12 && d.startsWith("998")) return `+${d}`;
  if (d.length >= 7)   return `+998${d.slice(-9).padStart(9, "0")}`;
  return null;
}

/** FIFO aging: oldest invoices assumed unpaid first */
export function calculateAging(totalDebt: number, invoices: DebtInvoice[], now = Date.now()) {
  const sorted = [...invoices].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let remaining = totalDebt;
  let days0to30 = 0, days31to60 = 0, days61to90 = 0, days91to100 = 0, daysOver100 = 0;

  for (const inv of sorted) {
    if (remaining <= 0) break;
    const amount = Math.min(inv.amount, remaining);
    const age = Math.floor((now - new Date(inv.date).getTime()) / 86_400_000);

    if      (age <= 30)  days0to30   += amount;
    else if (age <= 60)  days31to60  += amount;
    else if (age <= 90)  days61to90  += amount;
    else if (age <= 100) days91to100 += amount;
    else                 daysOver100 += amount;

    remaining -= amount;
  }
  if (remaining > 0) daysOver100 += remaining;

  return { days0to30, days31to60, days61to90, days91to100, daysOver100 };
}

async function getSystemUserId(): Promise<string> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT u.id FROM users u
    JOIN roles r ON r.id = u."roleId"
    WHERE r.name = 'DIRECTOR' AND u."isActive" = true
    ORDER BY u."createdAt" ASC LIMIT 1
  `;
  if (rows[0]) return rows[0].id;
  const fallback = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM users ORDER BY "createdAt" ASC LIMIT 1
  `;
  if (!fallback[0]) throw new Error("No users found in database");
  return fallback[0].id;
}

/** A real change made by the sync, written to the change feed shown in Settings. */
interface PendingChange {
  kind: OneCChangeKind;
  title: string;
  ref?: string | null;
  detail?: string | null;
  amount?: number | null;
  previousAmount?: number | null;
  clientId?: string | null;
}

interface SyncContext {
  systemUserId: string;
  changes: PendingChange[];
  // Potential/new clients, loaded on first need — most batches only touch known 1C clients.
  mergeable?: MatchIndex<MatchTarget>;
  rejected?: Set<string>;
}

function guessProvince(...hints: (string | undefined)[]): string | null {
  for (const h of hints) {
    if (!h) continue;
    const p = detectProvince(h);
    if (p) return p.key;
  }
  return null;
}

/**
 * Resolve a 1C counterparty to a client, making sure it is marked as a 1C (faol) client.
 *   1. same INN → that client
 *   2. same name among 1C clients → that client
 *   3. a potential/new client that is clearly the same business → promoted to 1C
 *      (no duplicate is created, and its real phone/province are kept)
 *   4. otherwise a new 1C client; doubtful look-alikes go to the review queue
 */
async function findOrLinkClient(
  ctx: SyncContext,
  rec: { name: string; inn: string; phone?: string; region?: string },
): Promise<{ id: string; created: boolean; updated: boolean }> {
  const { name, inn, phone, region } = rec;

  if (inn) {
    const r = await db.$queryRaw<{ id: string; source: string; province: string | null }[]>`
      SELECT id, source::text, province FROM clients WHERE inn = ${inn} LIMIT 1
    `;
    if (r[0]) {
      const updated = await ensureOneC(r[0].id, r[0].source, r[0].province, region ?? name);
      return { id: r[0].id, created: false, updated };
    }
  }

  const byName = await db.$queryRaw<{ id: string; inn: string | null; province: string | null }[]>`
    SELECT id, inn, province FROM clients
    WHERE source = 'ONEC' AND LOWER(name) = LOWER(${name}) LIMIT 1
  `;
  if (byName[0]) {
    let updated = false;
    if (inn && !byName[0].inn) {
      await db.$executeRaw`UPDATE clients SET inn = ${inn}, "updatedAt" = NOW() WHERE id = ${byName[0].id}`;
      updated = true;
    }
    if (await ensureOneC(byName[0].id, "ONEC", byName[0].province, region ?? name)) updated = true;
    return { id: byName[0].id, created: false, updated };
  }

  if (!ctx.mergeable) {
    [ctx.mergeable, ctx.rejected] = await Promise.all([loadMergeableIndex(), loadRejectedPairs()]);
  }
  const province = guessProvince(region, name);
  const matches = ctx.mergeable.find({ name, phone, inn });
  const auto = pickAutoMerge(matches, province);

  if (auto) {
    const id = auto.target.id;
    await db.$executeRaw`
      UPDATE clients SET
        source         = 'ONEC',
        "onecLinkedAt" = NOW(),
        inn            = COALESCE(inn, ${inn || null}),
        province       = COALESCE(province, ${province}),
        status         = CASE WHEN status = 'DEBTOR' THEN status ELSE 'ACTIVE' END,
        notes          = CONCAT_WS(E'\n', notes, ${`1C bilan bog'landi: ${name}`}::text),
        "updatedAt"    = NOW()
      WHERE id = ${id}
    `;
    ctx.mergeable.remove(id);
    await queueCandidates(id, matches.filter((m) => m !== auto), ctx.rejected!);
    return { id, created: false, updated: true };
  }

  const id = genId();
  const normalizedPhone =
    normalizePhone(phone) ??
    `+998000${(inn || "0000000").slice(-7).padStart(7, "0")}`;

  await db.$executeRaw`
    INSERT INTO clients (id, name, phone, status, source, "onecLinkedAt", province, "createdById", inn, "createdAt", "updatedAt")
    VALUES (${id}, ${name}, ${normalizedPhone}, 'ACTIVE', 'ONEC', NOW(), ${province}, ${ctx.systemUserId}, ${inn || null}, NOW(), NOW())
  `;
  await queueCandidates(id, matches, ctx.rejected!);
  return { id, created: true, updated: false };
}

/** Marks an existing client as a 1C client; returns true if anything changed. */
async function ensureOneC(id: string, source: string, province: string | null, provinceHint: string) {
  const guessed = province ? null : guessProvince(provinceHint);
  if (source === "ONEC" && !guessed) return false;
  await db.$executeRaw`
    UPDATE clients SET
      source         = 'ONEC',
      "onecLinkedAt" = COALESCE("onecLinkedAt", NOW()),
      province       = COALESCE(province, ${guessed}),
      status         = CASE WHEN source = 'ONEC' OR status = 'DEBTOR' THEN status ELSE 'ACTIVE' END,
      "updatedAt"    = NOW()
    WHERE id = ${id}
  `;
  return true;
}

async function queueCandidates(
  onecClientId: string,
  matches: MatchResult<MatchTarget>[],
  rejected: Set<string>,
) {
  const rows = matches.filter((m) => !rejected.has(`${onecClientId}|${m.target.id}`));
  if (!rows.length) return;
  await db.clientMatchCandidate.createMany({
    data: rows.map((m) => ({
      onecClientId,
      potentialClientId: m.target.id,
      score: Math.round(m.score * 1000) / 1000,
      reason: m.reason,
    })),
    skipDuplicates: true,
  });
}

/** A client that bought something is active again (a 1C debtor stays a debtor). */
async function markBuying(clientId: string) {
  await db.$executeRaw`
    UPDATE clients SET status = 'ACTIVE', "lastActivity" = NOW(), "updatedAt" = NOW()
    WHERE id = ${clientId} AND status NOT IN ('ACTIVE', 'DEBTOR')
  `;
}

async function upsertInvoice(
  sale: SaleRecord,
  clientId: string,
  ctx: SyncContext
): Promise<void> {
  const systemUserId = ctx.systemUserId;
  const externalId = `1C:${sale.number}`;
  const saleDate   = new Date(sale.date);
  const dueDate    = new Date(saleDate.getTime() + 30 * 86_400_000);

  const existing = await db.invoice.findFirst({
    where: { externalId },
    select: { id: true, total: true },
  });

  if (existing) {
    // The agent re-sends every sale on every run; only touch the row when 1C changed it.
    const before = Number(existing.total);
    if (!sameAmount(before, sale.amount)) {
      await db.invoice.update({
        where: { id: existing.id },
        data: { subtotal: sale.amount, total: sale.amount, updatedAt: new Date() },
      });
      ctx.changes.push({
        kind: "SALE_CHANGED", title: sale.clientName, ref: sale.number,
        amount: sale.amount, previousAmount: before, clientId,
      });
    }
    return;
  }

  let invoiceNumber = `1C-${sale.number}`;
  const conflict = await db.invoice.findFirst({ where: { number: invoiceNumber }, select: { id: true } });
  if (conflict) invoiceNumber = `1C-${sale.number}-${Date.now().toString(36)}`;

  await db.invoice.create({
    data: {
      number:      invoiceNumber,
      clientId,
      status:      "SENT",
      subtotal:    sale.amount,
      discount:    0,
      tax:         0,
      total:       sale.amount,
      paid:        0,
      notes:       sale.comment || undefined,
      externalId,
      source:      "1c",
      dueDate,
      createdById: systemUserId,
      createdAt:   saleDate,
    },
  });
  ctx.changes.push({ kind: "SALE_NEW", title: sale.clientName, ref: sale.number, detail: sale.date, amount: sale.amount, clientId });
}

async function upsertOneCDebt(debt: DebtRecord, clientId: string, ctx: SyncContext): Promise<void> {
  const aging = calculateAging(debt.totalDebt, debt.invoices ?? []);

  let status = "PENDING";
  if (debt.totalDebt <= 0) status = "PAID";
  else if (aging.days31to60 + aging.days61to90 + aging.days91to100 + aging.daysOver100 > 0)
    status = "OVERDUE";

  const existing = await db.$queryRaw<{ id: string; amount: number }[]>`
    SELECT id, amount::float8 AS amount FROM debts WHERE "clientId" = ${clientId} AND "syncSource" = '1c' LIMIT 1
  `;

  if (existing[0]) {
    if (!sameAmount(existing[0].amount, debt.totalDebt)) {
      ctx.changes.push({
        kind: "DEBT_CHANGED", title: debt.clientName,
        amount: debt.totalDebt, previousAmount: existing[0].amount, clientId,
      });
    }
    await db.$executeRaw`
      UPDATE debts SET
        amount        = ${debt.totalDebt},
        status        = ${status}::"DebtStatus",
        "days0to30"   = ${aging.days0to30},
        "days31to60"  = ${aging.days31to60},
        "days61to90"  = ${aging.days61to90},
        "days91to100" = ${aging.days91to100},
        "daysOver100" = ${aging.daysOver100},
        "lastSyncAt"  = NOW(),
        "updatedAt"   = NOW()
      WHERE id = ${existing[0].id}
    `;
  } else {
    if (debt.totalDebt > 0) ctx.changes.push({ kind: "DEBT_NEW", title: debt.clientName, amount: debt.totalDebt, clientId });
    const id = genId();
    await db.$executeRaw`
      INSERT INTO debts (
        id, "clientId", amount, "paidAmount", "dueDate", status,
        "days0to30", "days31to60", "days61to90", "days91to100", "daysOver100",
        "syncSource", "lastSyncAt", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${clientId}, ${debt.totalDebt}, 0, NOW(),
        ${status}::"DebtStatus",
        ${aging.days0to30}, ${aging.days31to60}, ${aging.days61to90},
        ${aging.days91to100}, ${aging.daysOver100},
        '1c', NOW(), NOW(), NOW()
      )
    `;
  }

  if (debt.totalDebt > 0) {
    await db.$executeRaw`
      UPDATE clients SET status = 'DEBTOR', "updatedAt" = NOW()
      WHERE id = ${clientId} AND status <> 'DEBTOR'
    `;
  } else {
    await releaseDebtors([clientId]);
  }
}

/** Debtors with no open debt left go back to plain active. */
async function releaseDebtors(clientIds: string[]) {
  if (!clientIds.length) return;
  await db.$executeRaw`
    UPDATE clients c SET status = 'ACTIVE', "updatedAt" = NOW()
    WHERE c.id = ANY(${clientIds}::text[]) AND c.status = 'DEBTOR'
      AND NOT EXISTS (
        SELECT 1 FROM debts d
        WHERE d."clientId" = c.id AND d.status IN ('PENDING', 'PARTIAL', 'OVERDUE') AND d.amount > 0
      )
  `;
}

/**
 * The agent only sends clients that still owe money, so a debt paid off in 1C simply
 * stops arriving. On the final batch of a run, close every 1C debt the run did not touch.
 * Skipped unless every batch of the run fully succeeded — a failed batch or record would
 * look like a paid debt.
 */
export async function closeDebtsMissingFromRun(runId: string): Promise<number> {
  const runs = await db.$queryRaw<{ started: Date | null; bad: number }[]>`
    SELECT MIN("startedAt") AS started,
           COUNT(*) FILTER (WHERE status <> 'SUCCESS')::int AS bad
    FROM onec_syncs WHERE "runId" = ${runId}
  `;
  const { started, bad } = runs[0] ?? { started: null, bad: 0 };
  if (!started || bad > 0) return 0;

  const closed = await db.$queryRaw<{ clientId: string; amount: number }[]>`
    UPDATE debts SET
      status       = 'PAID',
      "paidAmount" = amount,
      "resolvedAt" = NOW(),
      "updatedAt"  = NOW()
    WHERE "syncSource" = '1c'
      AND status IN ('PENDING', 'PARTIAL', 'OVERDUE')
      AND ("lastSyncAt" IS NULL OR "lastSyncAt" < ${started})
    RETURNING "clientId", amount::float8 AS amount
  `;
  await releaseDebtors([...new Set(closed.map((r) => r.clientId))]);

  if (closed.length) {
    const names = await db.client.findMany({
      where: { id: { in: closed.map((r) => r.clientId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(names.map((c) => [c.id, c.name]));
    await saveChanges(closed.map((r) => ({
      kind: "DEBT_CLOSED" as const, title: nameById.get(r.clientId) ?? "—",
      amount: 0, previousAmount: r.amount, clientId: r.clientId,
    })));
  }
  return closed.length;
}

// ─── Public sync processor ────────────────────────────────────────────────────

export async function processSyncPayload(payload: SyncPayload): Promise<SyncResult> {
  const t0 = Date.now();
  const result: SyncResult = {
    salesSynced: 0, debtsSynced: 0,
    cashFlowsSynced: 0, cashFlowsSkipped: 0,
    clientsCreated: 0, clientsUpdated: 0,
    errors: [], durationMs: 0,
  };

  const ctx: SyncContext = { systemUserId: await getSystemUserId(), changes: [] };

  for (const sale of payload.sales ?? []) {
    try {
      if (!sale.clientName || !sale.number) continue;
      const client = await findOrLinkClient(ctx, { name: sale.clientName, inn: sale.inn, phone: sale.phone });
      if (client.created) {
        result.clientsCreated++;
        ctx.changes.push({ kind: "CLIENT_NEW", title: sale.clientName, clientId: client.id });
      }
      if (client.updated) result.clientsUpdated++;
      await upsertInvoice(sale, client.id, ctx);
      await markBuying(client.id);
      result.salesSynced++;
    } catch (e) {
      result.errors.push(`sale[${sale.number}]: ${e instanceof Error ? e.message : e}`);
    }
  }

  for (const debt of payload.debts ?? []) {
    try {
      if (!debt.clientName) continue;
      const client = await findOrLinkClient(ctx, {
        name: debt.clientName, inn: debt.inn, phone: debt.phone, region: debt.region,
      });
      if (client.created) {
        result.clientsCreated++;
        ctx.changes.push({ kind: "CLIENT_NEW", title: debt.clientName, clientId: client.id });
      }
      if (client.updated) result.clientsUpdated++;
      await upsertOneCDebt(debt, client.id, ctx);
      result.debtsSynced++;
    } catch (e) {
      result.errors.push(`debt[${debt.clientName}]: ${e instanceof Error ? e.message : e}`);
    }
  }

  if (payload.cashFlows?.length) {
    await syncCashFlows(payload.cashFlows, result, ctx);
  }

  await saveChanges(ctx.changes);

  result.durationMs = Date.now() - t0;
  return result;
}

// ─── Cash flow (kirim / chiqim) ───────────────────────────────────────────────

/** Upsert the cash/bank movements of one batch, linking customer payments to clients by INN. */
async function syncCashFlows(records: CashFlowRecord[], result: SyncResult, ctx: SyncContext): Promise<void> {
  const { rows, skipped } = toCashFlowRows(records);
  result.cashFlowsSkipped += skipped;

  const inns = [...new Set(rows.filter((r) => r.category === "CUSTOMER" && r.counterpartyInn).map((r) => r.counterpartyInn!))];
  const clients = inns.length
    ? await db.client.findMany({ where: { inn: { in: inns } }, select: { id: true, inn: true } })
    : [];
  const clientByInn = new Map(clients.map((c) => [c.inn!, c.id]));

  const before = new Map(
    (await db.cashTransaction.findMany({
      where: { externalId: { in: rows.map((r) => r.externalId) } },
      select: { externalId: true, amount: true },
    })).map((r) => [r.externalId, Number(r.amount)]),
  );
  // The first import brings in months of history; only recent operations are news.
  const newsFrom = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);

  const done: string[] = [];
  for (const row of rows) {
    try {
      const data = {
        date: new Date(row.date),
        direction: row.direction,
        channel: row.channel,
        category: row.category,
        amount: row.amount,
        counterparty: row.counterparty,
        counterpartyInn: row.counterpartyInn,
        clientId: row.counterpartyInn ? clientByInn.get(row.counterpartyInn) ?? null : null,
        debitAccount: row.debitAccount,
        creditAccount: row.creditAccount,
        docRef: row.docRef,
        purpose: row.purpose,
      };
      await db.cashTransaction.upsert({
        where: { externalId: row.externalId },
        create: { externalId: row.externalId, ...data },
        update: data,
      });
      const prev = before.get(row.externalId);
      const news = prev === undefined ? row.date >= newsFrom : !sameAmount(prev, row.amount);
      if (news) {
        ctx.changes.push({
          kind: prev === undefined ? "CASH_NEW" : "CASH_CHANGED",
          title: row.counterparty || row.docRef,
          ref: row.docRef,
          detail: `${row.direction === "IN" ? "Kirim" : "Chiqim"} · ${row.channel === "CASH" ? "kassa" : "bank"}`,
          amount: row.amount,
          previousAmount: prev ?? null,
          clientId: data.clientId,
        });
      }
      done.push(row.externalId);
      result.cashFlowsSynced++;
    } catch (e) {
      result.errors.push(`cash[${row.docRef}]: ${e instanceof Error ? e.message : e}`);
    }
  }

  // Stamped with the database clock, the same one that stamps the run's start (see removeCashFlowsMissingFromRun).
  if (done.length) {
    await db.$executeRaw`UPDATE cash_transactions SET "syncedAt" = NOW() WHERE "externalId" = ANY(${done}::text[])`;
  }
}

/**
 * Entries unposted or deleted in 1C simply stop arriving. On the final batch of a run that
 * read the ledger from `from` on, remove mirrored rows from that date the run did not touch.
 * Skipped unless every batch of the run fully succeeded, and unless the run sent at least
 * one row (an empty read is more likely a broken query than an empty ledger).
 */
export async function removeCashFlowsMissingFromRun(runId: string, from: string): Promise<number> {
  const runs = await db.$queryRaw<{ started: Date | null; bad: number }[]>`
    SELECT MIN("startedAt") AS started,
           COUNT(*) FILTER (WHERE status <> 'SUCCESS')::int AS bad
    FROM onec_syncs WHERE "runId" = ${runId}
  `;
  const { started, bad } = runs[0] ?? { started: null, bad: 0 };
  if (!started || bad > 0) return 0;

  const touched = await db.cashTransaction.count({ where: { syncedAt: { gte: started } } });
  if (touched === 0) return 0;

  const removed = await db.cashTransaction.deleteMany({
    where: { date: { gte: new Date(from) }, syncedAt: { lt: started } },
  });
  if (removed.count > 0) {
    await saveChanges([{ kind: "CASH_REMOVED", title: `${removed.count} ta yozuv 1C'dan o'chgan`, detail: `${from} dan beri` }]);
  }
  return removed.count;
}

/** Best effort: a problem with the change feed must never fail the sync itself. */
async function saveChanges(changes: PendingChange[]): Promise<void> {
  if (!changes.length) return;
  try {
    await db.oneCChange.createMany({
      data: changes.slice(0, 1000).map((c) => ({
        kind: c.kind,
        title: c.title,
        ref: c.ref ?? null,
        detail: c.detail ?? null,
        amount: c.amount ?? null,
        previousAmount: c.previousAmount ?? null,
        clientId: c.clientId ?? null,
      })),
    });
  } catch (e) {
    console.error("[1C] could not save the change feed:", e);
  }
}
