import { type NextRequest } from "next/server";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/api";
import { db } from "@/lib/db";

function isValidApiKey(req: NextRequest): boolean {
  const key =
    req.headers.get("x-sync-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(key && key === process.env.ONEC_SYNC_SECRET);
}

export async function GET(req: NextRequest) {
  try {
    const hasApiKey = isValidApiKey(req);
    if (!hasApiKey) {
      const { requireAuth } = await import("@/lib/auth/server");
      await requireAuth();
    }

    const rows = await db.$queryRaw<{
      id: string;
      status: string;
      salesCount: number;
      debtsCount: number;
      clientsCreated: number;
      clientsUpdated: number;
      debtsClosed: number;
      runId: string | null;
      error: string | null;
      startedAt: Date;
      finishedAt: Date | null;
      createdAt: Date;
    }[]>`
      SELECT id, status, "salesCount", "debtsCount",
             "clientsCreated", "clientsUpdated", "debtsClosed", "runId",
             error, "startedAt", "finishedAt", "createdAt"
      FROM onec_syncs
      ORDER BY "createdAt" DESC
      LIMIT 20
    `;

    const last = rows[0] ?? null;
    const isOnline = (last?.status === "SUCCESS" || last?.status === "PARTIAL") &&
      last.finishedAt &&
      Date.now() - new Date(last.finishedAt).getTime() < 26 * 60 * 60 * 1000; // agent runs once a day

    return apiSuccess({
      status: last?.status ?? "NEVER",
      lastSync: last,
      isOnline,
      history: rows,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
