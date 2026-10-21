import { type NextRequest } from "next/server";
import type { AttendanceStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/api";
import { isMonth, monthRange, daysInMonth, defaultWorkingDays, PAID_DAY_WEIGHT } from "@/lib/hr/shared";

/** Monthly timesheet (tabel): employee × day grid. */
export async function GET(req: NextRequest) {
  try {
    await requirePermission("employees:read");
    const month = new URL(req.url).searchParams.get("month");
    if (!isMonth(month)) return apiError("month=YYYY-MM", 400);
    const { start, end } = monthRange(month);

    const [employees, marks] = await Promise.all([
      db.employee.findMany({
        where: { hireDate: { lt: end }, OR: [{ fireDate: null }, { fireDate: { gte: start } }] },
        select: { id: true, fullName: true, position: true, department: true },
        orderBy: [{ department: "asc" }, { fullName: "asc" }],
      }),
      db.attendance.findMany({
        where: { date: { gte: start, lt: end } },
        select: { employeeId: true, date: true, status: true },
      }),
    ]);

    const grid = new Map<string, Record<number, AttendanceStatus>>();
    for (const m of marks) {
      const row = grid.get(m.employeeId) ?? {};
      row[m.date.getUTCDate()] = m.status;
      grid.set(m.employeeId, row);
    }

    return apiSuccess({
      month,
      days: daysInMonth(month),
      workingDays: defaultWorkingDays(month),
      rows: employees.map((e) => {
        const days = grid.get(e.id) ?? {};
        const worked = Object.values(days).reduce((s, st) => s + PAID_DAY_WEIGHT[st], 0);
        return { ...e, days, worked };
      }),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
