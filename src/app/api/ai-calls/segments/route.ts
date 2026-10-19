import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, handleApiError } from "@/lib/utils/api";
import { db } from "@/lib/db";
import { CALL_SEGMENTS, callSegmentWhere, type CallSegment } from "@/lib/clients/category";

type SegmentStats = { total: number; provinces: { name: string; count: number }[] };

export async function GET() {
  try {
    await requirePermission("calls:read");

    const entries = await Promise.all(
      CALL_SEGMENTS.map(async (key): Promise<[CallSegment, SegmentStats]> => {
        const rows = await db.client.groupBy({
          by: ["province"],
          where: callSegmentWhere(key),
          _count: { id: true },
        });
        const provinces = rows
          .map((r) => ({ name: r.province || "Noma'lum", count: r._count.id }))
          .sort((a, b) => b.count - a.count);
        return [key, { total: provinces.reduce((s, p) => s + p.count, 0), provinces }];
      }),
    );

    return apiSuccess({ segments: Object.fromEntries(entries) as Record<CallSegment, SegmentStats> });
  } catch (e) {
    return handleApiError(e);
  }
}
