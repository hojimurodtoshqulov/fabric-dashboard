import { type NextRequest } from "next/server";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/api";
import { processSyncPayload, closeDebtsMissingFromRun, removeCashFlowsMissingFromRun, type SyncPayload } from "@/lib/sync/onec.service";
import { db } from "@/lib/db";

// A batch of ~100 records takes about a minute (several queries per record).
export const maxDuration = 300;

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
    if (!body.sales?.length && !body.debts?.length && !body.cashFlows?.length && !body.final) {
      return apiError("Payload must include sales, debts or cashFlows array", 400);
    }

    const syncId = `sync_${Date.now().toString(36)}`;
    // A single-request agent run (no runId) is its own run.
    const runId = body.runId || (body.final ? syncId : null);
    await db.$executeRaw`
      INSERT INTO onec_syncs (id, status, "runId", "createdAt", "startedAt")
      VALUES (${syncId}, 'RUNNING', ${runId}, NOW(), NOW())
    `;

    try {
      const result = await processSyncPayload(body);
      // Record-level errors must not pass as SUCCESS: a debt that failed to update
      // would otherwise be closed as "paid" at the end of the run.
      const status = result.errors.length ? "PARTIAL" : "SUCCESS";
      await db.$executeRaw`
        UPDATE onec_syncs SET
          status          = ${status},
          "salesCount"    = ${result.salesSynced},
          "debtsCount"    = ${result.debtsSynced},
          "cashFlowsCount"= ${result.cashFlowsSynced},
          "clientsCreated"= ${result.clientsCreated},
          "clientsUpdated"= ${result.clientsUpdated},
          error           = ${result.errors.length ? result.errors.slice(0, 20).join("\n") : null},
          "finishedAt"    = NOW()
        WHERE id = ${syncId}
      `;

      let debtsClosed = 0;
      if (body.final && runId) {
        debtsClosed = await closeDebtsMissingFromRun(runId);
        await db.$executeRaw`UPDATE onec_syncs SET "debtsClosed" = ${debtsClosed} WHERE id = ${syncId}`;
      }
      let cashFlowsRemoved = 0;
      if (body.final && runId && body.cashFrom && !Number.isNaN(Date.parse(body.cashFrom))) {
        cashFlowsRemoved = await removeCashFlowsMissingFromRun(runId, body.cashFrom);
      }
      return apiSuccess({ syncId, runId, debtsClosed, cashFlowsRemoved, ...result });
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
