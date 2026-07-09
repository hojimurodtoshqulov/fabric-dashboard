import { type NextRequest } from "next/server";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/api";
import { processSyncPayload, type SyncPayload } from "@/lib/sync/onec.service";
import { db } from "@/lib/db";

function isValidApiKey(req: NextRequest): boolean {
  const key =
    req.headers.get("x-sync-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(key && key === process.env.ONEC_SYNC_SECRET);
}

export async function POST(req: NextRequest) {
  try {
    if (!isValidApiKey(req)) return apiError("Unauthorized", 401);

    const body = (await req.json()) as SyncPayload;
    if (!body.sales?.length && !body.debts?.length) {
      return apiError("Payload must include sales or debts array", 400);
    }

    const syncId = `sync_${Date.now().toString(36)}`;
    await db.$executeRaw`
      INSERT INTO onec_syncs (id, status, "createdAt", "startedAt")
      VALUES (${syncId}, 'RUNNING', NOW(), NOW())
    `;

    try {
      const result = await processSyncPayload(body);
      await db.$executeRaw`
        UPDATE onec_syncs SET
          status          = 'SUCCESS',
          "salesCount"    = ${result.salesSynced},
          "debtsCount"    = ${result.debtsSynced},
          "clientsCreated"= ${result.clientsCreated},
          "clientsUpdated"= ${result.clientsUpdated},
          "finishedAt"    = NOW()
        WHERE id = ${syncId}
      `;
      return apiSuccess({ syncId, ...result });
    } catch (syncErr) {
      const msg = syncErr instanceof Error ? syncErr.message : String(syncErr);
      await db.$executeRaw`
        UPDATE onec_syncs SET status = 'FAILED', error = ${msg}, "finishedAt" = NOW()
        WHERE id = ${syncId}
      `;
      throw syncErr;
    }
  } catch (e) {
    return handleApiError(e);
  }
}
