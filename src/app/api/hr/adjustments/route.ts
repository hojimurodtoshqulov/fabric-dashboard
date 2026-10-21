import { type NextRequest } from "next/server";
import type { PayAdjustmentType } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission, createAuditLog } from "@/lib/auth/server";
import { apiSuccess, apiCreated, apiError, handleApiError } from "@/lib/utils/api";
import { parseAmount, assertMonthOpen, MonthLockedError } from "@/lib/hr/server";
import { isMonth, ADJUSTMENT_LABELS } from "@/lib/hr/shared";

/** Bonus, penalty or advance for an employee in a month. */
export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("payroll:update");
    const { employeeId, month, type, amount, reason } = await req.json();
    if (!isMonth(month)) return apiError("Oy noto'g'ri", 400);
    if (!(type in ADJUSTMENT_LABELS)) return apiError("Turi noto'g'ri", 400);
    const a = parseAmount(amount);
    if (a === undefined || a <= 0) return apiError("Summa noto'g'ri", 400);
    await assertMonthOpen(month);

    const adj = await db.payAdjustment.create({
      data: { employeeId, month, type: type as PayAdjustmentType, amount: a, reason: reason?.trim() || null, createdById: user.id },
    });
    await createAuditLog(user.id, "CREATE", "pay_adjustment", adj.id, null, { employeeId, month, type, amount: a }, req);
    return apiCreated({ id: adj.id });
  } catch (e) {
    if (e instanceof MonthLockedError) return apiError(e.message, 409);
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requirePermission("payroll:update");
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return apiError("id kerak", 400);
    const adj = await db.payAdjustment.findUnique({ where: { id } });
    if (!adj) return apiError("Topilmadi", 404);
    await assertMonthOpen(adj.month);
    await db.payAdjustment.delete({ where: { id } });
    await createAuditLog(user.id, "DELETE", "pay_adjustment", id, { ...adj, amount: Number(adj.amount) }, null, req);
    return apiSuccess({ deleted: true });
  } catch (e) {
    if (e instanceof MonthLockedError) return apiError(e.message, 409);
    return handleApiError(e);
  }
}
