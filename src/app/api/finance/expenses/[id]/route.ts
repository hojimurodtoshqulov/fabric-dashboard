import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, createAuditLog } from "@/lib/auth/server";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/api";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("expenses:update");
    const { id } = await params;
    const expense = await db.expense.findUnique({ where: { id } });
    if (!expense) return apiError("Topilmadi", 404);
    await db.expense.delete({ where: { id } });
    await createAuditLog(user.id, "DELETE", "expense", id, { ...expense, amount: Number(expense.amount) }, null, req);
    return apiSuccess({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
