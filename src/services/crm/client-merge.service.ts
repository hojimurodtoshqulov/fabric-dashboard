import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { deleteCache, CACHE_KEYS } from "@/lib/cache";
import { POTENTIAL_SOURCES, NEW_SOURCES } from "@/lib/clients/category";
import {
  MatchIndex, pickAutoMerge, isPlaceholderPhone, phoneKey, type MatchResult, type MatchTarget,
} from "@/lib/clients/matching";

// Every table with a clientId FK — history moves to the surviving 1C client on merge.
const CLIENT_FK_TABLES = [
  "invoices", "debts", "debt_reminders", "calls", "call_responses", "messages",
  "telegram_logs", "sms_logs", "leads", "tasks", "funnel_entries", "stock_movements",
] as const;

const MATCH_SELECT = { id: true, name: true, phone: true, inn: true, province: true } as const;

/** Clients a 1C client can absorb: potensial and yangi (both are "not yet buying"). */
const MERGEABLE_SOURCES = [...POTENTIAL_SOURCES, ...NEW_SOURCES];

export interface ScanResult {
  onecClients: number;
  autoMerged: number;
  queuedForReview: number;
}

/**
 * Fold a potential client into the 1C client it duplicates, then delete it.
 * The potential copy usually carries the real phone and province (1C often has neither),
 * so those move over; everything else it owned (calls, SMS, tasks…) is re-pointed.
 */
export async function mergeIntoOneC(
  onecClientId: string,
  potentialClientId: string,
  opts: { userId?: string; auto?: boolean } = {},
) {
  const [onec, pot] = await Promise.all([
    db.client.findUnique({ where: { id: onecClientId } }),
    db.client.findUnique({ where: { id: potentialClientId } }),
  ]);
  if (!onec || onec.source !== "ONEC") throw new Error("1C mijozi topilmadi");
  if (!pot || pot.source === "ONEC") throw new Error("Potensial mijoz topilmadi");

  const data: Prisma.ClientUpdateInput = {};
  const potHasPhone = !isPlaceholderPhone(pot.phone);
  if (potHasPhone && isPlaceholderPhone(onec.phone)) {
    data.phone = pot.phone;
    if (!onec.phone2 && pot.phone2) data.phone2 = pot.phone2;
  } else if (potHasPhone && phoneKey(pot.phone) !== phoneKey(onec.phone) && !onec.phone2) {
    data.phone2 = pot.phone;
  }
  for (const f of ["province", "region", "address", "email", "company", "telegramId"] as const) {
    if (!onec[f] && pot[f]) data[f] = pot[f];
  }
  if (!onec.segmentId && pot.segmentId) data.segment = { connect: { id: pot.segmentId } };
  if (!onec.assignedToId && pot.assignedToId) data.assignedTo = { connect: { id: pot.assignedToId } };
  if (!onec.leadSourceId && pot.leadSourceId) data.leadSource = { connect: { id: pot.leadSourceId } };
  const tags = [...new Set([...(onec.tags ?? []), ...(pot.tags ?? [])])];
  if (tags.length !== (onec.tags ?? []).length) data.tags = tags;
  const mergedNote = `Potensial ro'yxatdan birlashtirildi: ${pot.name}${pot.notes ? ` — ${pot.notes}` : ""}`;
  data.notes = [onec.notes, mergedNote].filter(Boolean).join("\n");
  if (pot.lastActivity && (!onec.lastActivity || pot.lastActivity > onec.lastActivity)) {
    data.lastActivity = pot.lastActivity;
  }

  await db.$transaction(async (tx) => {
    for (const table of CLIENT_FK_TABLES) {
      await tx.$executeRawUnsafe(
        `UPDATE "${table}" SET "clientId" = $1 WHERE "clientId" = $2`,
        onec.id, pot.id,
      );
    }
    await tx.clientMerge.create({
      data: {
        onecClientId: onec.id,
        removedClientId: pot.id,
        snapshot: JSON.parse(JSON.stringify(pot)),
        auto: opts.auto ?? false,
        mergedById: opts.userId,
      },
    });
    // Candidates pointing at the removed client go with it (FK cascade).
    await tx.client.delete({ where: { id: pot.id } });
    await tx.client.update({ where: { id: onec.id }, data });
  }, { timeout: 30_000 });

  await Promise.all([deleteCache(CACHE_KEYS.client(onec.id)), deleteCache(CACHE_KEYS.client(pot.id))]);
}

export async function loadMergeableIndex() {
  const targets = await db.client.findMany({
    where: { source: { in: MERGEABLE_SOURCES } },
    select: MATCH_SELECT,
  });
  return new MatchIndex<MatchTarget>(targets);
}

export async function loadRejectedPairs(): Promise<Set<string>> {
  const rows = await db.clientMatchCandidate.findMany({
    where: { status: "REJECTED" },
    select: { onecClientId: true, potentialClientId: true },
  });
  return new Set(rows.map((r) => `${r.onecClientId}|${r.potentialClientId}`));
}

/**
 * Handle duplicates of one 1C client: merge the single safe match, queue the rest.
 * Mutates `index` so a merged potential is not offered again in the same run.
 */
export async function resolveMatchesFor(
  onec: MatchTarget,
  index: MatchIndex<MatchTarget>,
  rejected: Set<string>,
  opts: { userId?: string } = {},
): Promise<{ merged: number; queued: number }> {
  const matches = index.find(onec).filter((m) => !rejected.has(`${onec.id}|${m.target.id}`));
  if (matches.length === 0) return { merged: 0, queued: 0 };

  let merged = 0;
  const auto = pickAutoMerge(matches, onec.province);
  if (auto) {
    await mergeIntoOneC(onec.id, auto.target.id, { userId: opts.userId, auto: true });
    index.remove(auto.target.id);
    merged = 1;
  }

  const review: MatchResult<MatchTarget>[] = matches.filter((m) => m !== auto);
  if (review.length) {
    await db.clientMatchCandidate.createMany({
      data: review.map((m) => ({
        onecClientId: onec.id,
        potentialClientId: m.target.id,
        score: Math.round(m.score * 1000) / 1000,
        reason: m.reason,
      })),
      skipDuplicates: true,
    });
  }
  return { merged, queued: review.length };
}

/** Compare every 1C client with every potential/new client. */
export async function scanAllDuplicates(opts: { userId?: string } = {}): Promise<ScanResult> {
  const [onecClients, index, rejected] = await Promise.all([
    db.client.findMany({ where: { source: "ONEC" }, select: MATCH_SELECT }),
    loadMergeableIndex(),
    loadRejectedPairs(),
  ]);

  const result: ScanResult = { onecClients: onecClients.length, autoMerged: 0, queuedForReview: 0 };
  for (const onec of onecClients) {
    const r = await resolveMatchesFor(onec, index, rejected, opts);
    result.autoMerged += r.merged;
    result.queuedForReview += r.queued;
  }
  return result;
}

export async function rejectCandidate(id: string, userId: string) {
  return db.clientMatchCandidate.update({
    where: { id },
    data: { status: "REJECTED", resolvedById: userId, resolvedAt: new Date() },
  });
}

export async function mergeCandidate(id: string, userId: string) {
  const c = await db.clientMatchCandidate.findUnique({ where: { id } });
  if (!c) throw new Error("Topilmadi");
  await mergeIntoOneC(c.onecClientId, c.potentialClientId, { userId });
}

/**
 * Newly added potential/new clients that only look like a 1C client (not certain enough
 * to block) go to the review page, so they are held back from campaigns until decided.
 */
export async function queueReviewForNewClients(clientIds: string[], onecIndex?: MatchIndex<MatchTarget>) {
  if (!clientIds.length) return 0;
  const [index, rejected, clients] = await Promise.all([
    onecIndex ?? loadOneCIndex(),
    loadRejectedPairs(),
    db.client.findMany({ where: { id: { in: clientIds }, source: { not: "ONEC" } }, select: MATCH_SELECT }),
  ]);
  const data = clients.flatMap((c) =>
    index.find(c)
      .filter((m) => !rejected.has(`${m.target.id}|${c.id}`))
      .map((m) => ({
        onecClientId: m.target.id,
        potentialClientId: c.id,
        score: Math.round(m.score * 1000) / 1000,
        reason: m.reason,
      })),
  );
  if (!data.length) return 0;
  const r = await db.clientMatchCandidate.createMany({ data, skipDuplicates: true });
  return r.count;
}

/**
 * Index of 1C clients, for keeping potential lists clean when importing or adding by hand.
 * Callers treat `pickAutoMerge(index.find(row))` as "already a 1C client".
 */
export async function loadOneCIndex() {
  const rows = await db.client.findMany({
    where: { source: "ONEC" },
    select: { ...MATCH_SELECT, phone2: true },
  });
  return new MatchIndex<MatchTarget>(rows);
}
