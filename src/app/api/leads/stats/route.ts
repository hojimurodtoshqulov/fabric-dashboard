import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, handleApiError } from "@/lib/utils/api";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await requirePermission("messages:read");

    type Row = { source: string; province: string | null; status: string; _count: { id: number } };

    const rows: Row[] = await (db as any).lead.groupBy({
      by: ["source", "province", "status"],
      _count: { id: true },
    });

    // Build province stats per source
    const sourceMap: Record<string, Record<string, number>> = {
      ALL:       {},
      TELEGRAM:  {},
      WEBSITE:   {},
      INSTAGRAM: {},
    };

    // Status totals
    const statusTotals: Record<string, number> = { NEW: 0, IN_PROGRESS: 0, CLOSED: 0, CONVERTED: 0 };

    for (const row of rows) {
      const prov = row.province || "Noma'lum";
      const cnt  = row._count.id;

      // all sources aggregated
      sourceMap.ALL[prov]          = (sourceMap.ALL[prov] ?? 0) + cnt;
      sourceMap[row.source][prov]  = (sourceMap[row.source][prov] ?? 0) + cnt;
      statusTotals[row.status]     = (statusTotals[row.status] ?? 0) + cnt;
    }

    const toProvinceList = (map: Record<string, number>) =>
      Object.entries(map)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    return apiSuccess({
      provinces: {
        ALL:       toProvinceList(sourceMap.ALL),
        TELEGRAM:  toProvinceList(sourceMap.TELEGRAM),
        WEBSITE:   toProvinceList(sourceMap.WEBSITE),
        INSTAGRAM: toProvinceList(sourceMap.INSTAGRAM),
      },
      statusTotals,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
