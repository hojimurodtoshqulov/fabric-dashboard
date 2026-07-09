import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, handleApiError } from "@/lib/utils/api";
import { db } from "@/lib/db";

const STATUS_MAP = {
  ACTIVE:   "doimiy",
  DEBTOR:   "qarzdor",
  LOST:     "yoqotilgan",
  PROSPECT: "yangi",
} as const;

type SegmentKey = "doimiy" | "qarzdor" | "yoqotilgan" | "yangi";

export async function GET() {
  try {
    await requirePermission("calls:read");

    const rows = await db.client.groupBy({
      by: ["status", "province"],
      where: { status: { in: ["ACTIVE", "DEBTOR", "LOST", "PROSPECT"] } },
      _count: { id: true },
    });

    const segments: Record<SegmentKey, { total: number; provinces: { name: string; count: number }[] }> = {
      doimiy:     { total: 0, provinces: [] },
      qarzdor:    { total: 0, provinces: [] },
      yoqotilgan: { total: 0, provinces: [] },
      yangi:      { total: 0, provinces: [] },
    };

    for (const row of rows) {
      const segKey = STATUS_MAP[row.status as keyof typeof STATUS_MAP];
      if (!segKey) continue;
      const provinceName = row.province || "Noma'lum";
      const count = row._count.id;

      segments[segKey].total += count;

      const existing = segments[segKey].provinces.find((p) => p.name === provinceName);
      if (existing) existing.count += count;
      else segments[segKey].provinces.push({ name: provinceName, count });
    }

    for (const seg of Object.values(segments)) {
      seg.provinces.sort((a, b) => b.count - a.count);
    }

    return apiSuccess({ segments });
  } catch (e) {
    return handleApiError(e);
  }
}
