import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  invoice: { groupBy: vi.fn() },
  stockMovement: { aggregate: vi.fn() },
  expense: { groupBy: vi.fn() },
  expenseCategory: { findMany: vi.fn() },
}));
const payrollCost = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/services/hr/payroll.service", () => ({ payrollCost }));

import { monthPnL, pnlTrend } from "./profit.service";

function setup(o: {
  invoices?: { source: string; total: number }[];
  materials?: number | null;
  payroll?: number;
  expenses?: { categoryId: string; amount: number }[];
  categories?: { id: string; name: string; color: string }[];
}) {
  db.invoice.groupBy.mockResolvedValue((o.invoices ?? []).map((i) => ({ source: i.source, _sum: { total: i.total } })));
  db.stockMovement.aggregate.mockResolvedValue({ _sum: { totalAmount: o.materials ?? null } });
  payrollCost.mockResolvedValue({ amount: o.payroll ?? 0, source: "estimate" });
  db.expense.groupBy.mockResolvedValue((o.expenses ?? []).map((e) => ({ categoryId: e.categoryId, _sum: { amount: e.amount } })));
  db.expenseCategory.findMany.mockResolvedValue(o.categories ?? []);
}

beforeEach(() => vi.clearAllMocks());

describe("monthPnL", () => {
  it("adds up revenue, costs, profit and margin", async () => {
    setup({
      invoices: [{ source: "1c", total: 8_000_000 }, { source: "manual", total: 2_000_000 }],
      materials: 2_000_000,
      payroll: 3_000_000,
      expenses: [{ categoryId: "a", amount: 300_000 }, { categoryId: "b", amount: 700_000 }],
      categories: [{ id: "a", name: "Kommunal", color: "#111" }, { id: "b", name: "Transport", color: "#222" }],
    });
    const r = await monthPnL("2026-10");
    expect(r.revenue).toBe(10_000_000);
    expect(r.revenue1c).toBe(8_000_000);
    expect(r.expenses).toBe(1_000_000);
    expect(r.totalCost).toBe(6_000_000);
    expect(r.profit).toBe(4_000_000);
    expect(r.margin).toBe(40);
  });

  it("lists expense categories biggest first, with a dash for unknown ones", async () => {
    setup({
      expenses: [{ categoryId: "a", amount: 300_000 }, { categoryId: "b", amount: 700_000 }, { categoryId: "gone", amount: 100_000 }],
      categories: [{ id: "a", name: "Kommunal", color: "#111" }, { id: "b", name: "Transport", color: "#222" }],
    });
    const r = await monthPnL("2026-10");
    expect(r.expensesByCategory.map((c) => c.name)).toEqual(["Transport", "Kommunal", "—"]);
  });

  it("has no margin when there was no revenue, and shows the loss", async () => {
    setup({ payroll: 1_000_000 });
    const r = await monthPnL("2026-10");
    expect(r.revenue).toBe(0);
    expect(r.margin).toBeNull();
    expect(r.profit).toBe(-1_000_000);
  });

  it("rounds the margin to one decimal", async () => {
    setup({ invoices: [{ source: "1c", total: 3_000_000 }], materials: 1_000_000 });
    expect((await monthPnL("2026-10")).margin).toBe(66.7);
  });
});

describe("pnlTrend", () => {
  it("returns the requested months oldest first", async () => {
    setup({});
    const t = await pnlTrend("2026-02", 3);
    expect(t.map((m) => m.month)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
});
