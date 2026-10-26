import { describe, expect, it } from "vitest";
import {
  cashFlowKey, categoryLabel, categoryOf, toCashFlowRow, toCashFlowRows, type CashFlowRecord,
} from "./cashflow";

const rec = (over: Partial<CashFlowRecord>): CashFlowRecord => ({
  date: "2026-10-22",
  docRef: "Приходный кассовый ордер СС1 от 22.10.2026",
  debitAccount: "50.01",
  creditAccount: "62.01",
  amount: 1_000_000,
  ...over,
});

describe("toCashFlowRow direction and channel", () => {
  it("treats Dt cash / Kt customers as cash coming in", () => {
    const r = toCashFlowRow(rec({ creditName: "Клиент", creditInn: "123" }))!;
    expect(r.direction).toBe("IN");
    expect(r.channel).toBe("CASH");
    expect(r.category).toBe("CUSTOMER");
    expect(r.counterparty).toBe("Клиент");
    expect(r.counterpartyInn).toBe("123");
  });

  it("treats Dt bank / Kt customers as a bank receipt", () => {
    const r = toCashFlowRow(rec({ debitAccount: "51.01" }))!;
    expect(r.direction).toBe("IN");
    expect(r.channel).toBe("BANK");
  });

  it("treats Kt bank as money going out, and takes the counterparty from the debit side", () => {
    const r = toCashFlowRow(rec({
      debitAccount: "60.01", creditAccount: "51.01", debitName: "Поставщик", debitInn: "999", creditName: "Расчетный счет",
    }))!;
    expect(r.direction).toBe("OUT");
    expect(r.channel).toBe("BANK");
    expect(r.category).toBe("SUPPLIER");
    expect(r.counterparty).toBe("Поставщик");
    expect(r.counterpartyInn).toBe("999");
  });

  it("counts the foreign-currency account as bank", () => {
    expect(toCashFlowRow(rec({ debitAccount: "52.01" }))!.channel).toBe("BANK");
  });

  it("skips cash ↔ bank transfers", () => {
    expect(toCashFlowRow(rec({ debitAccount: "50.01", creditAccount: "51.01" }))).toBeNull();
    expect(toCashFlowRow(rec({ debitAccount: "51.01", creditAccount: "50.01" }))).toBeNull();
  });

  it("skips money in transit and entries that do not touch cash or bank", () => {
    expect(toCashFlowRow(rec({ debitAccount: "50.01", creditAccount: "57.01" }))).toBeNull();
    expect(toCashFlowRow(rec({ debitAccount: "20.01", creditAccount: "60.01" }))).toBeNull();
  });

  it("skips empty, zero and negative amounts and entries without a document", () => {
    expect(toCashFlowRow(rec({ amount: 0 }))).toBeNull();
    expect(toCashFlowRow(rec({ amount: -5 }))).toBeNull();
    expect(toCashFlowRow(rec({ docRef: "" }))).toBeNull();
  });

  it("works with codes written without dots", () => {
    const r = toCashFlowRow(rec({ debitAccount: "5001", creditAccount: "6201" }))!;
    expect(r.direction).toBe("IN");
    expect(r.category).toBe("CUSTOMER");
  });
});

describe("categoryOf", () => {
  it("sorts outgoing money by the debit account", () => {
    expect(categoryOf("OUT", "60.01")).toBe("SUPPLIER");
    expect(categoryOf("OUT", "70")).toBe("PAYROLL");
    expect(categoryOf("OUT", "68.01")).toBe("TAX");
    expect(categoryOf("OUT", "69.02")).toBe("TAX");
    for (const a of ["20.01", "25", "26", "44.01", "71.01"]) expect(categoryOf("OUT", a)).toBe("EXPENSE");
    expect(categoryOf("OUT", "76.05")).toBe("OTHER");
  });

  it("calls incoming money from customers a payment and anything else other", () => {
    expect(categoryOf("IN", "62.01")).toBe("CUSTOMER");
    expect(categoryOf("IN", "66.01")).toBe("OTHER");
    expect(categoryOf("IN", "60.01")).toBe("OTHER");
  });

  it("keeps a refund to a customer under customers", () => {
    expect(categoryOf("OUT", "62.01")).toBe("CUSTOMER");
    expect(categoryLabel("OUT", "CUSTOMER")).toBe("Mijozga qaytarilgan");
    expect(categoryLabel("IN", "CUSTOMER")).toBe("Mijozlardan to'lov");
  });
});

describe("toCashFlowRows", () => {
  it("sums lines of one document that map to the same row", () => {
    const { rows } = toCashFlowRows([
      rec({ amount: 100.1, creditInn: "1" }),
      rec({ amount: 50.2, creditInn: "1" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(150.3);
  });

  it("keeps different counterparties and documents apart", () => {
    const { rows } = toCashFlowRows([
      rec({ creditInn: "1" }),
      rec({ creditInn: "2" }),
      rec({ creditInn: "1", docRef: "Другой документ" }),
    ]);
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((r) => r.externalId)).size).toBe(3);
  });

  it("counts what it skipped", () => {
    const { rows, skipped } = toCashFlowRows([
      rec({}),
      rec({ debitAccount: "50.01", creditAccount: "51.01" }),
      rec({ amount: 0 }),
    ]);
    expect(rows).toHaveLength(1);
    expect(skipped).toBe(2);
  });
});

describe("cashFlowKey", () => {
  it("ignores dots in account codes and prefers the INN over the name", () => {
    expect(cashFlowKey(rec({ debitAccount: "50.01", creditAccount: "62.01", creditInn: "7", creditName: "A" })))
      .toBe(cashFlowKey(rec({ debitAccount: "5001", creditAccount: "6201", creditInn: "7", creditName: "B" })));
  });
});
