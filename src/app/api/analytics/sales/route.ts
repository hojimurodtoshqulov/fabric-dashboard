import { type NextRequest } from "next/server";
import { analyticsService } from "@/services/analytics/analytics.service";
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, handleApiError } from "@/lib/utils/api";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("analytics:read");
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") || "monthly") as "daily" | "weekly" | "monthly" | "yearly";

    const data = await analyticsService.getSalesSummary(period);
    return apiSuccess(data);
  } catch (e) {
    return handleApiError(e);
  }
}
