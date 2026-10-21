import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, createAuditLog } from "@/lib/auth/server";
import { apiSuccess, apiCreated, apiError, handleApiError } from "@/lib/utils/api";
import { parseAmount } from "@/lib/hr/server";
import { isMonth, isDateString, dateOnly, monthRange } from "@/lib/hr/shared";

const PAYMENT_METHODS = ["CASH", "CARD", "TRANSFER"];

export async function GET(req: NextRequest) {
  try {
    await requirePermission("expenses:read");
    const sp = new URL(req.url).searchParams;
    const month = sp.get("month");
    if (!isMonth(month)) return apiError("month=YYYY-MM", 400);
    const categoryId = sp.get("categoryId") || undefined;
    const { start, end } = monthRange(month);

    const [expenses, categories] = await Promise.all([
      db.expense.findMany({
        where: { date: { gte: start, lt: end }, ...(categoryId && { categoryId }) },
        include: { category: true },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
      db.expenseCategory.findMany({ orderBy: { name: "asc" } }),
    ]);

    const byCategory = new Map<string, number>();
    for (const e of expenses) byCategory.set(e.categoryId, (byCategory.get(e.categoryId) ?? 0) + Number(e.amount));

    return apiSuccess({
      expenses: expenses.map((e) => ({ ...e, amount: Number(e.amount) })),
      categories: categories.map((c) => ({ ...c, total: byCategory.get(c.id) ?? 0 })),
      total: expenses.reduce((s, e) => s + Number(e.amount), 0),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("expenses:update");
    const { date, categoryId, amount, description, paymentMethod } = await req.json();
    if (!isDateString(date)) return apiError("Sana noto'g'ri", 400);
    const a = parseAmount(amount);
    if (a === undefined || a <= 0) return apiError("Summa noto'g'ri", 400);
    if (!(await db.expenseCategory.findUnique({ where: { id: categoryId } }))) return apiError("Xarajat turi tanlanmagan", 400);

    const expense = await db.expense.create({
      data: {
        date: dateOnly(date), categoryId, amount: a,
        description: description?.trim() || null,
        paymentMethod: PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : null,
        createdById: user.id,
      },
    });
    await createAuditLog(user.id, "CREATE", "expense", expense.id, null, { date, categoryId, amount: a }, req);
    return apiCreated({ id: expense.id });
  } catch (e) {
    return handleApiError(e);
  }
}
