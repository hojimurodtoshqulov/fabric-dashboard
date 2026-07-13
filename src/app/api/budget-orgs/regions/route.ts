import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { PROVINCE_GROUPS } from "@/lib/provinces";

export async function GET() {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const groups = await db.$queryRaw<{ province: string | null; status: string; count: bigint }[]>`
      SELECT province, status::text AS status, COUNT(*)::bigint AS count
      FROM "budget_orgs"
      WHERE province IS NOT NULL
      GROUP BY province, status
    `;

    const [{ total }] = await db.$queryRaw<[{ total: bigint }]>`
      SELECT COUNT(*)::bigint AS total FROM "budget_orgs"
    `;

    type Stats = { total: number; active: number; inactive: number; prospect: number; contract: number; rejected: number };
    const map = new Map<string, Stats>(
      PROVINCE_GROUPS.map(p => [p.key, { total: 0, active: 0, inactive: 0, prospect: 0, contract: 0, rejected: 0 }])
    );

    for (const g of groups) {
      if (!g.province) continue;
      const entry = map.get(g.province);
      if (!entry) continue;
      const n = Number(g.count);
      entry.total    += n;
      if (g.status === "ACTIVE")   entry.active   += n;
      if (g.status === "INACTIVE") entry.inactive += n;
      if (g.status === "PROSPECT") entry.prospect += n;
      if (g.status === "CONTRACT") entry.contract += n;
      if (g.status === "REJECTED") entry.rejected += n;
    }

    const regions = PROVINCE_GROUPS.map(p => ({
      key: p.key,
      label: p.label,
      ...map.get(p.key)!,
    })).sort((a, b) => b.total - a.total);

    return NextResponse.json({ success: true, data: { total: Number(total), regions } });
  } catch (e: any) {
    console.error("[budget-orgs/regions]", e);
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}
