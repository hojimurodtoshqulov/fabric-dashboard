import { requirePermission } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { apiSuccess, handleApiError } from "@/lib/utils/api";
import { PROVINCE_GROUPS, UNKNOWN_PROVINCE_KEY } from "@/lib/provinces";
import { clientCategory } from "@/lib/clients/category";
import type { ClientSource, ClientStatus } from "@prisma/client";

type RawGroup = { province: string | null; source: ClientSource; status: ClientStatus; count: bigint };
type Stats = { total: number; faol: number; qarzdor: number; potensial: number; yangi: number };

const empty = (): Stats => ({ total: 0, faol: 0, qarzdor: 0, potensial: 0, yangi: 0 });

function add(s: Stats, g: RawGroup) {
  const n = Number(g.count);
  const cat = clientCategory(g.source, g.status);
  s.total += n;
  if (cat === "qarzdor") { s.qarzdor += n; s.faol += n; } // debtors are faol too
  else s[cat] += n;
}

export async function GET() {
  try {
    await requirePermission("clients:read");

    const groups = await db.$queryRaw<RawGroup[]>`
      SELECT province, source, status, COUNT(*)::bigint AS count
      FROM clients
      GROUP BY province, source, status
    `;

    const totals = empty();
    const unknown = empty();
    const map = new Map<string, Stats>(PROVINCE_GROUPS.map(p => [p.key, empty()]));

    for (const g of groups) {
      add(totals, g);
      add((g.province && map.get(g.province)) || unknown, g);
    }

    const regions = PROVINCE_GROUPS.map(p => ({ key: p.key, label: p.label, ...map.get(p.key)! }))
      .sort((a, b) => b.total - a.total);
    if (unknown.total > 0) {
      regions.push({ key: UNKNOWN_PROVINCE_KEY, label: "Viloyati noma'lum", ...unknown });
    }

    return apiSuccess({ total: totals.total, totals, regions });
  } catch (e) {
    return handleApiError(e);
  }
}
