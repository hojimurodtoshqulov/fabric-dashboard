import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, apiCreated, apiError, handleApiError } from "@/lib/utils/api";
import { can, assertMonthOpen, MonthLockedError } from "@/lib/hr/server";
import { isDateString, dateOnly } from "@/lib/hr/shared";

/** Piecework recorded for a day. */
export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("employees:read");
    const date = new URL(req.url).searchParams.get("date");
    if (!isDateString(date)) return apiError("date=YYYY-MM-DD", 400);
    const showPay = can(user.role, "payroll:read");

    const entries = await db.pieceWork.findMany({
      where: { date: dateOnly(date) },
      include: {
        employee: { select: { id: true, fullName: true, department: true } },
        pieceRate: { select: { id: true, name: true, unit: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return apiSuccess({
      entries: entries.map((e) => ({
        ...e,
        quantity: Number(e.quantity),
        price: showPay ? Number(e.price) : null,
        amount: showPay ? Number(e.amount) : null,
      })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("attendance:update");
    const { date, employeeId, pieceRateId, quantity, note } = await req.json();
    if (!isDateString(date)) return apiError("Sana noto'g'ri", 400);
    const qty = Number(String(quantity).replace(",", "."));
    if (!Number.isFinite(qty) || qty <= 0) return apiError("Miqdor noto'g'ri", 400);
    await assertMonthOpen(date.slice(0, 7));

    const rate = await db.pieceRate.findUnique({ where: { id: pieceRateId } });
    if (!rate || !rate.isActive) return apiError("Ishbay turi topilmadi", 400);
    const price = Number(rate.price);

    const entry = await db.pieceWork.create({
      data: {
        employeeId, pieceRateId,
        date: dateOnly(date),
        quantity: qty,
        price,
        amount: Math.round(price * qty),
        note: note?.trim() || null,
        createdById: user.id,
      },
    });
    return apiCreated({ id: entry.id });
  } catch (e) {
    if (e instanceof MonthLockedError) return apiError(e.message, 409);
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requirePermission("attendance:update");
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return apiError("id kerak", 400);
    const entry = await db.pieceWork.findUnique({ where: { id }, select: { date: true } });
    if (!entry) return apiError("Topilmadi", 404);
    await assertMonthOpen(entry.date.toISOString().slice(0, 7));
    await db.pieceWork.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (e) {
    if (e instanceof MonthLockedError) return apiError(e.message, 409);
    return handleApiError(e);
  }
}
