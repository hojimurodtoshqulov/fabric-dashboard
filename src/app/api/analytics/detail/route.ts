import { type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/api";
import { getMetricDetail } from "@/services/analytics/detail.service";
import { isMetric, parsePage } from "@/lib/analytics/metrics";

export const maxDuration = 60;

/** The table behind one dashboard figure: ?metric=clients&q=…&page=2 */
export async function GET(req: NextRequest) {
  try {
    await requirePermission("analytics:read");
    const params = new URL(req.url).searchParams;
    const metric = params.get("metric");
    if (!isMetric(metric)) return apiError("metric noto'g'ri", 400);
    const detail = await getMetricDetail(metric, { q: params.get("q") ?? "", page: parsePage(params.get("page")) });
    return apiSuccess(detail);
  } catch (e) {
    return handleApiError(e);
  }
}
