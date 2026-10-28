import type { OneCChangeKind } from "@prisma/client";
import { db } from "@/lib/db";
import { freshness, type Freshness } from "@/lib/sync/onec-status";

export interface OneCChangeRow {
  id: string;
  kind: OneCChangeKind;
  title: string;
  ref: string | null;
  detail: string | null;
  amount: number | null;
  previousAmount: number | null;
  clientId: string | null;
  createdAt: string;
}

export interface OneCStatus {
  freshness: Freshness;
  /** Latest sync attempt, whatever its result. */
  lastSync: { status: string; at: string; agentVersion: string | null; error: string | null } | null;
  /** Latest sync that finished successfully (the one `freshness` is based on). */
  lastSuccessAt: string | null;
  /** When the debt list was last read in full from 1C. */
  lastDebtsReadAt: string | null;
  last24h: { syncs: number; failed: number };
  sales: { count: number; newestDate: string | null };
  debts: { openCount: number; openTotal: number; notSeenCount: number };
  cash: { count: number; newestDate: string | null; lastSyncedAt: string | null };
  changes: OneCChangeRow[];
}

const OPEN = ["PENDING", "PARTIAL", "OVERDUE"] as const;
const iso = (d: Date | null | undefined) => d?.toISOString() ?? null;

export async function getOneCStatus(changesLimit = 60): Promise<OneCStatus> {
  const since = new Date(Date.now() - 24 * 3_600_000);
  const [last, lastOk, total24, failed24, debtsRead, sales, open, cash, changes] = await Promise.all([
    db.oneCSync.findFirst({ orderBy: { startedAt: "desc" } }),
    db.oneCSync.findFirst({ where: { status: { in: ["SUCCESS", "PARTIAL"] }, finishedAt: { not: null } }, orderBy: { finishedAt: "desc" } }),
    db.oneCSync.count({ where: { startedAt: { gte: since } } }),
    db.oneCSync.count({ where: { startedAt: { gte: since }, status: "FAILED" } }),
    db.debt.aggregate({ where: { syncSource: "1c" }, _max: { lastSyncAt: true } }),
    db.invoice.aggregate({ where: { source: "1c" }, _count: true, _max: { createdAt: true } }),
    db.debt.aggregate({ where: { syncSource: "1c", status: { in: [...OPEN] } }, _count: true, _sum: { amount: true } }),
    db.cashTransaction.aggregate({ _count: true, _max: { date: true, syncedAt: true } }),
    db.oneCChange.findMany({ orderBy: { createdAt: "desc" }, take: changesLimit }),
  ]);

  // Open debts the last full read did not mention: most likely paid in 1C already. The agent
  // sends every debtor each run, so a debt unseen for a day is not in 1C's list any more.
  const readAt = debtsRead._max.lastSyncAt;
  const notSeenCount = readAt
    ? await db.debt.count({
        where: {
          syncSource: "1c", status: { in: [...OPEN] },
          lastSyncAt: { lt: new Date(readAt.getTime() - 24 * 3_600_000) },
        },
      })
    : 0;

  return {
    freshness: freshness(lastOk?.finishedAt),
    lastSync: last
      ? { status: last.status, at: (last.finishedAt ?? last.startedAt).toISOString(), agentVersion: last.agentVersion, error: last.error }
      : null,
    lastSuccessAt: iso(lastOk?.finishedAt),
    lastDebtsReadAt: iso(readAt),
    last24h: { syncs: total24, failed: failed24 },
    sales: { count: sales._count, newestDate: iso(sales._max.createdAt) },
    debts: { openCount: open._count, openTotal: Number(open._sum.amount ?? 0), notSeenCount },
    cash: { count: cash._count, newestDate: iso(cash._max.date), lastSyncedAt: iso(cash._max.syncedAt) },
    changes: changes.map((c) => ({
      id: c.id,
      kind: c.kind,
      title: c.title,
      ref: c.ref,
      detail: c.detail,
      amount: c.amount === null ? null : Number(c.amount),
      previousAmount: c.previousAmount === null ? null : Number(c.previousAmount),
      clientId: c.clientId,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}
