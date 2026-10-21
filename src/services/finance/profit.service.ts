import { db } from "@/lib/db";
import { monthRange, shiftMonth } from "@/lib/hr/shared";
import { payrollCost } from "@/services/hr/payroll.service";

export interface MonthPnL {
  month: string;
  revenue: number;          // invoices issued in the month (1C sales + manual), accrual basis
  revenue1c: number;
  materials: number;        // raw material purchases recorded as warehouse receipts (IN)
  payroll: number;          // wages incl. advances
  payrollSource: "saved" | "estimate";
  payrollStatus?: string;
  expenses: number;
  expensesByCategory: { id: string; name: string; color: string; amount: number }[];
  totalCost: number;
  profit: number;
  margin: number | null;    // profit / revenue, %
}

/**
 * Profit and loss for one month. Dates are compared in UTC, which matches 1C sale dates
 * ("2026-06-01" → UTC midnight).
 */
export async function monthPnL(month: string): Promise<MonthPnL> {
  const { start, end } = monthRange(month);
  const [invoices, materials, payroll, expenseGroups, categories] = await Promise.all([
    db.invoice.groupBy({
      by: ["source"],
      where: { createdAt: { gte: start, lt: end }, status: { not: "CANCELLED" } },
      _sum: { total: true },
    }),
    db.stockMovement.aggregate({
      where: { type: "IN", createdAt: { gte: start, lt: end } },
      _sum: { totalAmount: true },
    }),
    payrollCost(month),
    db.expense.groupBy({ by: ["categoryId"], where: { date: { gte: start, lt: end } }, _sum: { amount: true } }),
    db.expenseCategory.findMany(),
  ]);

  const revenue = invoices.reduce((s, i) => s + Number(i._sum.total ?? 0), 0);
  const revenue1c = Number(invoices.find((i) => i.source === "1c")?._sum.total ?? 0);
  const materialsAmount = Number(materials._sum.totalAmount ?? 0);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const expensesByCategory = expenseGroups
    .map((g) => {
      const c = catById.get(g.categoryId);
      return { id: g.categoryId, name: c?.name ?? "—", color: c?.color ?? "#64748b", amount: Number(g._sum.amount ?? 0) };
    })
    .sort((a, b) => b.amount - a.amount);
  const expenses = expensesByCategory.reduce((s, c) => s + c.amount, 0);
  const totalCost = materialsAmount + payroll.amount + expenses;
  const profit = revenue - totalCost;

  return {
    month,
    revenue, revenue1c,
    materials: materialsAmount,
    payroll: payroll.amount,
    payrollSource: payroll.source,
    payrollStatus: payroll.status,
    expenses, expensesByCategory,
    totalCost, profit,
    margin: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : null,
  };
}

/** The last `count` months ending with `lastMonth`, oldest first. */
export async function pnlTrend(lastMonth: string, count = 12): Promise<MonthPnL[]> {
  const months = Array.from({ length: count }, (_, i) => shiftMonth(lastMonth, i - count + 1));
  return Promise.all(months.map(monthPnL));
}
