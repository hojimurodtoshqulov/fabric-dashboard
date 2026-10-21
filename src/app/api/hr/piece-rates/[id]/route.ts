import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, createAuditLog } from "@/lib/auth/server";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/api";
import { parseAmount } from "@/lib/hr/server";

/** New price applies to work recorded from now on; past entries keep their own price. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("payroll:update");
    const { id } = await params;
    const { name, unit, price, isActive } = await req.json();

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = String(name).trim();
    if (unit !== undefined) data.unit = String(unit).trim() || "dona";
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (price !== undefined) {
      const p = parseAmount(price);
      if (p === undefined || p <= 0) return apiError("Narx noto'g'ri", 400);
      data.price = p;
    }
    const rate = await db.pieceRate.update({ where: { id }, data });
    await createAuditLog(user.id, "UPDATE", "piece_rate", id, null, data, req);
    return apiSuccess({ rate: { ...rate, price: Number(rate.price) } });
  } catch (e) {
    return handleApiError(e);
  }
}
