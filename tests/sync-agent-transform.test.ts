import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const { transformSales, transformDebts } = createRequire(import.meta.url)("../sync-agent/src/transform.js");

describe("transformSales", () => {
  const sale = { date: "2026-10-01", number: "SS1", amount: 1000, clientName: "Клиент", inn: "123", phone: "", contract: "", comment: "" };

  it("keeps valid sales and fills optional fields", () => {
    expect(transformSales([sale])).toEqual([{ ...sale, phone: undefined }]);
  });
  it("drops sales without a number, client or positive amount", () => {
    expect(transformSales([
      { ...sale, number: "" },
      { ...sale, clientName: "" },
      { ...sale, amount: 0 },
      { ...sale, amount: -5 },
    ])).toEqual([]);
  });
});

describe("transformDebts", () => {
  const debt = { clientName: "Клиент", inn: "123", phone: "", region: "", totalDebt: 500 };

  it("attaches the client's invoices by INN", () => {
    const invoices = [
      { inn: "123", date: "2026-09-01", number: "A", amount: 300 },
      { inn: "999", date: "2026-09-02", number: "B", amount: 100 },
      { inn: "123", date: "2026-09-03", number: "C", amount: 200 },
    ];
    const [d] = transformDebts([debt], invoices);
    expect(d.invoices).toEqual([
      { date: "2026-09-01", number: "A", amount: 300 },
      { date: "2026-09-03", number: "C", amount: 200 },
    ]);
  });
  it("gives an empty invoice list when nothing matches", () => {
    expect(transformDebts([debt], [])[0].invoices).toEqual([]);
  });
  it("drops settled or nameless debtors", () => {
    expect(transformDebts([{ ...debt, totalDebt: 0 }, { ...debt, clientName: "" }], [])).toEqual([]);
  });
});

describe("transformCashFlows", () => {
  const { transformCashFlows } = createRequire(import.meta.url)("../sync-agent/src/transform.js");
  const entry = {
    date: "2026-10-22", docRef: "ПКО СС1 от 22.10.2026", debitAccount: "50.01", creditAccount: "62.01",
    debitName: "", debitInn: "", creditName: "Клиент", creditInn: "123", purpose: "", amount: 100.1,
  };

  it("sums lines that share a document, accounts and counterparties", () => {
    const out = transformCashFlows([entry, { ...entry, amount: 50.2 }]);
    expect(out).toHaveLength(1);
    expect(out[0].amount).toBe(150.3);
  });

  it("keeps different counterparties apart", () => {
    expect(transformCashFlows([entry, { ...entry, creditInn: "456", creditName: "Другой" }])).toHaveLength(2);
  });

  it("drops entries without a document or a positive amount", () => {
    expect(transformCashFlows([{ ...entry, docRef: "" }, { ...entry, amount: 0 }])).toEqual([]);
  });

  it("groups exactly the way the server keys its rows", async () => {
    // One agent record must map to one server row: same key on both sides.
    const { cashFlowKey } = await import("../src/lib/sync/cashflow");
    const variants = [
      entry,
      { ...entry, debitAccount: "5001", amount: 5 },                  // dots don't matter
      { ...entry, creditInn: "", creditName: "Клиент", amount: 7 },    // INN missing -> name is the key
      { ...entry, debitName: "Статья ДДС", amount: 9 },                // money-side subconto differs
    ];
    const agent = transformCashFlows(variants);
    const serverKeys = new Set(variants.map((v) => cashFlowKey(v)));
    expect(agent).toHaveLength(serverKeys.size);
  });
});
