import type { PayType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PAID_DAY_WEIGHT, monthRange, defaultWorkingDays } from "@/lib/hr/shared";

export interface PayrollLine {
  employeeId: string;
  fullName: string;
  position: string;
  department: string | null;
  payType: PayType;
  baseSalary: number;
  dailyRate: number;
  workedDays: number;
  markedDays: number; // days with any attendance mark — 0 means nobody filled the tabel
  baseAmount: number;
  pieceAmount: number;
  bonus: number;
  penalty: number;
  advance: number;
  total: number;
}

const round = (n: number) => Math.round(n);

/** Employees on the books at any point in the month. */
function employedDuring(month: string): Prisma.EmployeeWhereInput {
  const { start, end } = monthRange(month);
  return {
    hireDate: { lt: end },
    OR: [{ fireDate: null }, { fireDate: { gte: start } }],
  };
}

/**
 * Salary for each employee for a month, from attendance, piecework and adjustments.
 *   Belgilangan oylik: salary × worked days / working days (capped at the full salary)
 *   Kunbay:            daily rate × worked days
 *   Ishbay:            piecework only
 * Piecework and bonuses add to any pay type; penalties and advances are subtracted.
 */
export async function calculatePayroll(month: string, workingDays = defaultWorkingDays(month)): Promise<PayrollLine[]> {
  const { start, end } = monthRange(month);
  const [employees, attendance, piece, adjustments] = await Promise.all([
    db.employee.findMany({ where: employedDuring(month), orderBy: [{ department: "asc" }, { fullName: "asc" }] }),
    db.attendance.findMany({ where: { date: { gte: start, lt: end } }, select: { employeeId: true, status: true } }),
    db.pieceWork.groupBy({ by: ["employeeId"], where: { date: { gte: start, lt: end } }, _sum: { amount: true } }),
    db.payAdjustment.groupBy({ by: ["employeeId", "type"], where: { month }, _sum: { amount: true } }),
  ]);

  const days = new Map<string, { worked: number; marked: number }>();
  for (const a of attendance) {
    const d = days.get(a.employeeId) ?? { worked: 0, marked: 0 };
    d.worked += PAID_DAY_WEIGHT[a.status];
    d.marked += 1;
    days.set(a.employeeId, d);
  }
  const pieceBy = new Map(piece.map((p) => [p.employeeId, Number(p._sum.amount ?? 0)]));
  const adjBy = new Map<string, number>();
  for (const a of adjustments) adjBy.set(`${a.employeeId}:${a.type}`, Number(a._sum.amount ?? 0));

  return employees.map((e) => {
    const { worked, marked } = days.get(e.id) ?? { worked: 0, marked: 0 };
    return {
      employeeId: e.id,
      fullName: e.fullName,
      position: e.position,
      department: e.department,
      payType: e.payType,
      baseSalary: Number(e.baseSalary),
      dailyRate: Number(e.dailyRate),
      workedDays: worked,
      markedDays: marked,
      ...payAmounts({
        payType: e.payType,
        baseSalary: Number(e.baseSalary),
        dailyRate: Number(e.dailyRate),
        workedDays: worked,
        workingDays,
        piece: pieceBy.get(e.id) ?? 0,
        bonus: adjBy.get(`${e.id}:BONUS`) ?? 0,
        penalty: adjBy.get(`${e.id}:PENALTY`) ?? 0,
        advance: adjBy.get(`${e.id}:ADVANCE`) ?? 0,
      }),
    };
  });
}

/** The salary formula itself, free of the database. */
export function payAmounts(i: {
  payType: PayType; baseSalary: number; dailyRate: number; workedDays: number; workingDays: number;
  piece: number; bonus: number; penalty: number; advance: number;
}) {
  const baseAmount =
    i.payType === "MONTHLY" ? (i.workingDays > 0 ? i.baseSalary * Math.min(i.workedDays, i.workingDays) / i.workingDays : 0)
    : i.payType === "DAILY" ? i.dailyRate * i.workedDays
    : 0;
  return {
    baseAmount: round(baseAmount),
    pieceAmount: round(i.piece),
    bonus: round(i.bonus),
    penalty: round(i.penalty),
    advance: round(i.advance),
    total: round(baseAmount + i.piece + i.bonus - i.penalty - i.advance),
  };
}

/**
 * Freeze the month: store each line as calculated now. After this, attendance, piecework
 * and adjustments of the month are locked (see assertMonthOpen) until it is reopened.
 */
export async function approvePayroll(month: string, workingDays: number) {
  const existing = await db.payroll.findUnique({ where: { month } });
  if (existing && existing.status !== "DRAFT") throw new Error("Bu oy allaqachon tasdiqlangan");
  const lines = await calculatePayroll(month, workingDays);

  return db.$transaction(async (tx) => {
    const data = { workingDays, status: "APPROVED" as const, approvedAt: new Date() };
    const payroll = existing
      ? await tx.payroll.update({ where: { id: existing.id }, data })
      : await tx.payroll.create({ data: { month, ...data } });
    await tx.payrollItem.deleteMany({ where: { payrollId: payroll.id } });
    await tx.payrollItem.createMany({
      data: lines.map((l) => ({
        payrollId: payroll.id,
        employeeId: l.employeeId,
        payType: l.payType,
        workedDays: l.workedDays,
        baseAmount: l.baseAmount,
        pieceAmount: l.pieceAmount,
        bonus: l.bonus,
        penalty: l.penalty,
        advance: l.advance,
        total: l.total,
      })),
    });
    return payroll;
  });
}

/** Approved/paid payroll lines as stored, or null if the month is still open. */
export async function frozenPayroll(month: string): Promise<{ status: string; workingDays: number; lines: PayrollLine[] } | null> {
  const p = await db.payroll.findUnique({
    where: { month },
    include: { items: { include: { employee: true } } },
  });
  if (!p || p.status === "DRAFT") return null;
  const lines = p.items
    .map((i): PayrollLine => ({
      employeeId: i.employeeId,
      fullName: i.employee.fullName,
      position: i.employee.position,
      department: i.employee.department,
      payType: i.payType,
      baseSalary: Number(i.employee.baseSalary),
      dailyRate: Number(i.employee.dailyRate),
      workedDays: Number(i.workedDays),
      markedDays: Number(i.workedDays),
      baseAmount: Number(i.baseAmount),
      pieceAmount: Number(i.pieceAmount),
      bonus: Number(i.bonus),
      penalty: Number(i.penalty),
      advance: Number(i.advance),
      total: Number(i.total),
    }))
    .sort((a, b) => (a.department ?? "").localeCompare(b.department ?? "") || a.fullName.localeCompare(b.fullName));
  return { status: p.status, workingDays: p.workingDays, lines };
}

/**
 * Wage cost of a month for the P&L: the saved payroll if there is one, otherwise a live
 * estimate. Advances are part of the wage cost (paid earlier), so they are added back.
 */
export async function payrollCost(month: string): Promise<{ amount: number; source: "saved" | "estimate"; status?: string }> {
  const frozen = await frozenPayroll(month);
  const lines = frozen?.lines ?? await calculatePayroll(month);
  const amount = lines.reduce((s, l) => s + l.total + l.advance, 0);
  return frozen ? { amount, source: "saved", status: frozen.status } : { amount, source: "estimate" };
}
