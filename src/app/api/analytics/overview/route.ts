import { type NextRequest } from "next/server";
import { analyticsService } from "@/services/analytics/analytics.service";
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, handleApiError } from "@/lib/utils/api";

export async function GET(_req: NextRequest) {
  try {
    await requirePermission("analytics:read");
    const overview = await analyticsService.getDashboardOverview();
    return apiSuccess(overview);
  } catch (e) {
    return handleApiError(e);
  }
}
