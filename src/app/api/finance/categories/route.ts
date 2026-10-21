import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";
import { apiCreated, apiError, handleApiError } from "@/lib/utils/api";

const PALETTE = ["#f59e0b", "#8b5cf6", "#06b6d4", "#ef4444", "#10b981", "#ec4899", "#84cc16", "#f97316"];

/** New expense category (the list itself comes with GET /api/finance/expenses). */
export async function POST(req: NextRequest) {
  try {
    await requirePermission("expenses:update");
    const { name } = await req.json();
    if (!name?.trim()) return apiError("Nomi majburiy", 400);
    if (await db.expenseCategory.findUnique({ where: { name: name.trim() } })) return apiError("Bunday tur bor", 409);
    const count = await db.expenseCategory.count();
    const category = await db.expenseCategory.create({
      data: { name: name.trim(), color: PALETTE[count % PALETTE.length] },
    });
    return apiCreated({ category });
  } catch (e) {
    return handleApiError(e);
  }
}
