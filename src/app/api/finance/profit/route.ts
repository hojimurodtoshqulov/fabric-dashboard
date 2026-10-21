import { type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/api";
import { monthPnL, pnlTrend } from "@/services/finance/profit.service";
import { isMonth } from "@/lib/hr/shared";

export const maxDuration = 60;

/** Owner-only profit & loss: the month in detail plus a 12-month trend. */
export async function GET(req: NextRequest) {
  try {
    await requirePermission("finance:profit");
    const month = new URL(req.url).searchParams.get("month");
    if (!isMonth(month)) return apiError("month=YYYY-MM", 400);
    const [current, trend] = await Promise.all([monthPnL(month), pnlTrend(month, 12)]);
    return apiSuccess({ current, trend });
  } catch (e) {
    return handleApiError(e);
  }
}
