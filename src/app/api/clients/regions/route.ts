import { requirePermission } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/utils/api";
import { PROVINCE_GROUPS } from "@/lib/provinces";

type RawGroup = { province: string | null; status: string; count: bigint };

export async function GET() {
  try {
    await requirePermission("clients:read");

    // $queryRaw — Prisma client province tipini bilmasa ham ishlaydi
    const groups = await db.$queryRaw<RawGroup[]>`
      SELECT province, status, COUNT(*)::bigint as count
      FROM clients
      WHERE province IS NOT NULL
      GROUP BY province, status
    `;

    const total = await db.client.count();

    type Stats = { total: number; active: number; inactive: number; debtor: number; lost: number; prospect: number };

    const map = new Map<string, Stats>(
      PROVINCE_GROUPS.map(p => [p.key, { total: 0, active: 0, inactive: 0, debtor: 0, lost: 0, prospect: 0 }])
    );

    for (const g of groups) {
      if (!g.province) continue;
      const entry = map.get(g.province);
      if (!entry) continue;
      const n = Number(g.count);
      entry.total    += n;
      if (g.status === "ACTIVE")   entry.active   += n;
      if (g.status === "INACTIVE") entry.inactive += n;
      if (g.status === "DEBTOR")   entry.debtor   += n;
      if (g.status === "LOST")     entry.lost     += n;
      if (g.status === "PROSPECT") entry.prospect += n;
    }

    const regions = PROVINCE_GROUPS.map(p => ({
      key: p.key,
      label: p.label,
      ...map.get(p.key)!,
    })).sort((a, b) => b.total - a.total);

    return apiSuccess({ total, regions });
  } catch (e) {
    return handleApiError(e);
  }
}
