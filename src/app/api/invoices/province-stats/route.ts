import type { NextRequest } from "next/server";

export const revalidate = 30;
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, handleApiError } from "@/lib/utils/api";
import { db } from "@/lib/db";
import { PROVINCE_GROUPS } from "@/lib/provinces";

type RawRow = { province: string; count: bigint };

export async function GET(_req: NextRequest) {
  try {
    await requirePermission("sales:read");

    const rows = await db.$queryRaw<RawRow[]>`
      SELECT c.province, COUNT(i.id)::bigint AS count
      FROM clients c
      INNER JOIN invoices i ON i."clientId" = c.id
      WHERE c.province IS NOT NULL
      GROUP BY c.province
    `;

    const countMap = new Map(rows.map((r) => [r.province, Number(r.count)]));
    const provinces = PROVINCE_GROUPS.map((p) => ({
      key: p.key,
      label: p.label,
      count: countMap.get(p.key) ?? 0,
    }));

    return apiSuccess({ provinces });
  } catch (e) {
    return handleApiError(e);
  }
}
