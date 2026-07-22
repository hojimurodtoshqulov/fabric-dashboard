import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, handleApiError } from "@/lib/utils/api";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission("calls:read");

    const [totalCalls, byStatus, byResult, byMode, dtmfResponses] = await Promise.all([
      db.call.count(),

      db.call.groupBy({ by: ["status"], _count: { id: true } }),

      // callResult is a new column not yet in Prisma client — use raw SQL
      db.$queryRaw<{ result: string | null; count: bigint }[]>`
        SELECT "callResult" AS result, COUNT(*)::bigint AS count
        FROM calls
        WHERE "callResult" IS NOT NULL
        GROUP BY "callResult"
      `,

      // callMode is a new column — use raw SQL
      db.$queryRaw<{ mode: string | null; count: bigint }[]>`
        SELECT "callMode" AS mode, COUNT(*)::bigint AS count
        FROM calls
        GROUP BY "callMode"
      `,

      // call_responses is a new table — use raw SQL
      db.$queryRaw<{ key: string; label: string; count: bigint }[]>`
        SELECT "responseKey" AS key, "responseLabel" AS label, COUNT(*)::bigint AS count
        FROM call_responses
        GROUP BY "responseKey", "responseLabel"
        ORDER BY count DESC
      `,
    ]);

    const completed = byStatus.find((s) => s.status === "COMPLETED")?._count.id ?? 0;
    const noAnswer  = byStatus.find((s) => s.status === "NO_ANSWER")?._count.id ?? 0;
    const failed    = byStatus.find((s) => s.status === "FAILED")?._count.id ?? 0;
    const busy      = byStatus.find((s) => s.status === "BUSY")?._count.id ?? 0;
    const answered  = totalCalls > 0 ? Math.round((completed / totalCalls) * 100) : 0;

    return apiSuccess({
      summary: { total: totalCalls, completed, noAnswer, failed, busy, answeredRate: answered },
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      byResult: byResult.map((r) => ({ result: r.result, count: Number(r.count) })),
      byMode:   byMode.map((m) => ({ mode: m.mode, count: Number(m.count) })),
      dtmfBreakdown: dtmfResponses.map((d) => ({ key: d.key, label: d.label, count: Number(d.count) })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
