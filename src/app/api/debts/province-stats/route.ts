import type { NextRequest } from "next/server";

export const revalidate = 30;
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { PROVINCE_GROUPS } from "@/lib/provinces";
import { NextResponse } from "next/server";

type RawRow = { province: string; count: bigint };

export async function GET(_req: NextRequest) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db.$queryRaw<RawRow[]>`
    SELECT c.province, COUNT(d.id)::bigint AS count
    FROM clients c
    INNER JOIN debts d ON d."clientId" = c.id
    WHERE c.province IS NOT NULL
    GROUP BY c.province
  `;

  const countMap = new Map(rows.map((r) => [r.province, Number(r.count)]));
  const provinces = PROVINCE_GROUPS.map((p) => ({
    key: p.key,
    label: p.label,
    count: countMap.get(p.key) ?? 0,
  }));

  return NextResponse.json({ success: true, data: { provinces } });
}
