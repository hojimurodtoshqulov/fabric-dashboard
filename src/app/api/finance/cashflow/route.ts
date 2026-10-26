import { type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/api";
import { monthCashFlow, cashTrend, listTransactions } from "@/services/finance/cashflow.service";
import { isMonth } from "@/lib/hr/shared";

export const maxDuration = 60;

/** Owner-only cash flow (kirim/chiqim from 1C): the month in detail, a 12-month trend and the entries. */
export async function GET(req: NextRequest) {
  try {
    await requirePermission("finance:profit");
    const params = new URL(req.url).searchParams;
    const month = params.get("month");
    if (!isMonth(month)) return apiError("month=YYYY-MM", 400);
    const dir = params.get("direction");
    const direction = dir === "IN" || dir === "OUT" ? dir : undefined;

    const [current, trend, transactions] = await Promise.all([
      monthCashFlow(month),
      cashTrend(month, 12),
      listTransactions(month, direction),
    ]);
    return apiSuccess({ current, trend, transactions });
  } catch (e) {
    return handleApiError(e);
  }
}
