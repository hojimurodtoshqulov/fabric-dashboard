import { type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/utils/api";

type RawDistrict = { region: string | null; count: bigint };

export async function GET(req: NextRequest) {
  try {
    await requirePermission("clients:read");
    const { searchParams } = new URL(req.url);
    const provinceKey = searchParams.get("province");
    if (!provinceKey) return apiSuccess({ districts: [] });

    // $queryRaw — Prisma client province tipini bilmasa ham ishlaydi
    const rows = await db.$queryRaw<RawDistrict[]>`
      SELECT region, COUNT(*)::bigint as count
      FROM clients
      WHERE province = ${provinceKey} AND region IS NOT NULL
      GROUP BY region
      ORDER BY count DESC
    `;

    const districts = rows
      .filter(r => r.region)
      .map(r => ({ region: r.region as string, count: Number(r.count) }));

    return apiSuccess({ districts });
  } catch (e) {
    return handleApiError(e);
  }
}
