import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, createAuditLog } from "@/lib/auth/server";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/api";
import { calculatePayroll, frozenPayroll, approvePayroll } from "@/services/hr/payroll.service";
import { isMonth, defaultWorkingDays } from "@/lib/hr/shared";

/** The month's payroll: frozen lines if approved/paid, otherwise a live calculation. */
export async function GET(req: NextRequest) {
  try {
    await requirePermission("payroll:read");
    const sp = new URL(req.url).searchParams;
    const month = sp.get("month");
    if (!isMonth(month)) return apiError("month=YYYY-MM", 400);

    const frozen = await frozenPayroll(month);
    const draft = frozen ? null : await db.payroll.findUnique({ where: { month } });
    const wdParam = Number(sp.get("workingDays"));
    const workingDays = frozen?.workingDays
      ?? (wdParam > 0 && wdParam <= 31 ? wdParam : draft?.workingDays ?? defaultWorkingDays(month));
    const lines = frozen?.lines ?? await calculatePayroll(month, workingDays);

    const adjustments = await db.payAdjustment.findMany({
      where: { month },
      include: { employee: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess({
      month,
      status: frozen?.status ?? "DRAFT",
      workingDays,
      lines,
      totals: {
        base: lines.reduce((s, l) => s + l.baseAmount, 0),
        piece: lines.reduce((s, l) => s + l.pieceAmount, 0),
        bonus: lines.reduce((s, l) => s + l.bonus, 0),
        penalty: lines.reduce((s, l) => s + l.penalty, 0),
        advance: lines.reduce((s, l) => s + l.advance, 0),
        total: lines.reduce((s, l) => s + l.total, 0),
      },
      adjustments: adjustments.map((a) => ({ ...a, amount: Number(a.amount) })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/** { month, action: "approve" | "pay" | "reopen", workingDays? } */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requirePermission("payroll:update");
    const { month, action, workingDays } = await req.json();
    if (!isMonth(month)) return apiError("Oy noto'g'ri", 400);

    const current = await db.payroll.findUnique({ where: { month } });
    if (action === "approve") {
      const wd = Number(workingDays) || current?.workingDays || defaultWorkingDays(month);
      if (wd < 1 || wd > 31) return apiError("Ish kunlari soni noto'g'ri", 400);
      await approvePayroll(month, wd);
    } else if (action === "pay") {
      if (current?.status !== "APPROVED") return apiError("Avval oylikni tasdiqlang", 400);
      await db.payroll.update({ where: { month }, data: { status: "PAID", paidAt: new Date() } });
    } else if (action === "reopen") {
      if (!current || current.status === "DRAFT") return apiError("Oy ochiq", 400);
      await db.payroll.update({ where: { month }, data: { status: "DRAFT", approvedAt: null, paidAt: null } });
    } else {
      return apiError("action: approve | pay | reopen", 400);
    }

    await createAuditLog(user.id, "UPDATE", "payroll", month, current?.status ?? null, { action }, req);
    return apiSuccess({ month, action });
  } catch (e) {
    return handleApiError(e);
  }
}
