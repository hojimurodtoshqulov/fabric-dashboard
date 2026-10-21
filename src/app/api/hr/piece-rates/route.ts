import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, createAuditLog } from "@/lib/auth/server";
import { apiSuccess, apiCreated, apiError, handleApiError } from "@/lib/utils/api";
import { can, parseAmount } from "@/lib/hr/server";

/** Piecework price list. The foreman sees the names (to record work), not the prices. */
export async function GET() {
  try {
    const user = await requirePermission("employees:read");
    const showPay = can(user.role, "payroll:read");
    const rates = await db.pieceRate.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] });
    return apiSuccess({
      rates: rates.map((r) => ({ ...r, price: showPay ? Number(r.price) : null })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("payroll:update");
    const { name, unit, price } = await req.json();
    const p = parseAmount(price);
    if (!name?.trim()) return apiError("Nomi majburiy", 400);
    if (p === undefined || p <= 0) return apiError("Narx noto'g'ri", 400);
    const rate = await db.pieceRate.create({
      data: { name: name.trim(), unit: unit?.trim() || "dona", price: p },
    });
    await createAuditLog(user.id, "CREATE", "piece_rate", rate.id, null, { name: rate.name, price: p }, req);
    return apiCreated({ rate: { ...rate, price: Number(rate.price) } });
  } catch (e) {
    return handleApiError(e);
  }
}
