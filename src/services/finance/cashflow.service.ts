import type { CashCategory, CashChannel, CashDirection } from "@prisma/client";
import { db } from "@/lib/db";
import { monthRange, shiftMonth } from "@/lib/hr/shared";

export interface CategoryTotal { direction: CashDirection; category: CashCategory; amount: number }
export interface ChannelTotal { channel: CashChannel; in: number; out: number }

export interface MonthCashFlow {
  month: string;
  totalIn: number;
  totalOut: number;
  net: number;              // in − out
  byChannel: ChannelTotal[];
  byCategory: CategoryTotal[];   // biggest first within each direction
  lastSyncedAt: string | null;   // when 1C last confirmed any cash row
}

export interface CashTrendPoint { month: string; in: number; out: number; net: number }

export interface CashTransactionRow {
  id: string;
  date: string;             // "2026-10-22"
  direction: CashDirection;
  channel: CashChannel;
  category: CashCategory;
  amount: number;
  counterparty: string | null;
  client: { id: string; name: string } | null;
  docRef: string;
  purpose: string | null;
}

export interface GroupSum { direction: CashDirection; channel: CashChannel; category: CashCategory; amount: number }

/** Totals of one month from per-(direction, channel, category) sums. Free of the database. */
export function summarizeGroups(month: string, groups: GroupSum[], lastSyncedAt: Date | null = null): MonthCashFlow {
  let totalIn = 0, totalOut = 0;
  const channels = new Map<CashChannel, ChannelTotal>();
  const categories = new Map<string, CategoryTotal>();

  for (const g of groups) {
    if (g.direction === "IN") totalIn += g.amount; else totalOut += g.amount;

    const ch = channels.get(g.channel) ?? { channel: g.channel, in: 0, out: 0 };
    if (g.direction === "IN") ch.in += g.amount; else ch.out += g.amount;
    channels.set(g.channel, ch);

    const key = `${g.direction}:${g.category}`;
    const cat = categories.get(key) ?? { direction: g.direction, category: g.category, amount: 0 };
    cat.amount += g.amount;
    categories.set(key, cat);
  }

  return {
    month, totalIn, totalOut, net: totalIn - totalOut,
    byChannel: [...channels.values()].sort((a, b) => a.channel.localeCompare(b.channel)),
    byCategory: [...categories.values()].sort((a, b) => b.amount - a.amount),
    lastSyncedAt: lastSyncedAt?.toISOString() ?? null,
  };
}

/** The `count` months ending with `lastMonth`, oldest first, zero-filled where nothing was posted. */
export function fillTrend(lastMonth: string, count: number, rows: { month: string; direction: CashDirection; amount: number }[]): CashTrendPoint[] {
  const months = Array.from({ length: count }, (_, i) => shiftMonth(lastMonth, i - count + 1));
  return months.map((month) => {
    const sum = (d: CashDirection) => rows.filter((r) => r.month === month && r.direction === d).reduce((s, r) => s + r.amount, 0);
    const inAmount = sum("IN"), outAmount = sum("OUT");
    return { month, in: inAmount, out: outAmount, net: inAmount - outAmount };
  });
}

export async function monthCashFlow(month: string): Promise<MonthCashFlow> {
  const { start, end } = monthRange(month);
  const [groups, last] = await Promise.all([
    db.cashTransaction.groupBy({
      by: ["direction", "channel", "category"],
      where: { date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    db.cashTransaction.aggregate({ _max: { syncedAt: true } }),
  ]);
  return summarizeGroups(
    month,
    groups.map((g) => ({ direction: g.direction, channel: g.channel, category: g.category, amount: Number(g._sum.amount ?? 0) })),
    last._max.syncedAt,
  );
}

export async function cashTrend(lastMonth: string, count = 12): Promise<CashTrendPoint[]> {
  const from = monthRange(shiftMonth(lastMonth, 1 - count)).start;
  const to = monthRange(lastMonth).end;
  const rows = await db.$queryRaw<{ month: string; direction: CashDirection; amount: number }[]>`
    SELECT to_char(date, 'YYYY-MM') AS month, direction::text AS direction, SUM(amount)::float8 AS amount
    FROM cash_transactions
    WHERE date >= ${from} AND date < ${to}
    GROUP BY 1, 2
  `;
  return fillTrend(lastMonth, count, rows);
}

/** Newest first. Capped: a month holds a few hundred rows at most. */
export async function listTransactions(month: string, direction?: CashDirection, take = 300): Promise<CashTransactionRow[]> {
  const { start, end } = monthRange(month);
  const rows = await db.cashTransaction.findMany({
    where: { date: { gte: start, lt: end }, ...(direction ? { direction } : {}) },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
    include: { client: { select: { id: true, name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    date: r.date.toISOString().slice(0, 10),
    direction: r.direction,
    channel: r.channel,
    category: r.category,
    amount: Number(r.amount),
    counterparty: r.counterparty,
    client: r.client,
    docRef: r.docRef,
    purpose: r.purpose,
  }));
}
