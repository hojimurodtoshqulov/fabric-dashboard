import { type NextRequest } from "next/server";
import type { AttendanceStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/api";
import { ATTENDANCE_LABELS, isDateString, dateOnly } from "@/lib/hr/shared";
import { assertMonthOpen, MonthLockedError } from "@/lib/hr/server";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** One day: every employee on the books that day, with their mark (if any). */
export async function GET(req: NextRequest) {
  try {
    await requirePermission("employees:read");
    const date = new URL(req.url).searchParams.get("date");
    if (!isDateString(date)) return apiError("date=YYYY-MM-DD", 400);
    const day = dateOnly(date);

    const [employees, marks] = await Promise.all([
      db.employee.findMany({
        where: { hireDate: { lte: day }, OR: [{ fireDate: null }, { fireDate: { gte: day } }] },
        select: { id: true, fullName: true, position: true, department: true },
        orderBy: [{ department: "asc" }, { fullName: "asc" }],
      }),
      db.attendance.findMany({ where: { date: day } }),
    ]);
    const byEmployee = new Map(marks.map((m) => [m.employeeId, m]));

    return apiSuccess({
      date,
      rows: employees.map((e) => {
        const m = byEmployee.get(e.id);
        return { ...e, status: m?.status ?? null, checkIn: m?.checkIn ?? null, checkOut: m?.checkOut ?? null, note: m?.note ?? null };
      }),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

interface Entry {
  employeeId: string;
  status: AttendanceStatus | null; // null clears the mark
  checkIn?: string | null;
  checkOut?: string | null;
  note?: string | null;
}

/** Save marks for a day in one go: { date, entries: [...] }. */
export async function PUT(req: NextRequest) {
  try {
    const user = await requirePermission("attendance:update");
    const { date, entries } = (await req.json()) as { date: string; entries: Entry[] };
    if (!isDateString(date)) return apiError("Sana noto'g'ri", 400);
    if (!Array.isArray(entries) || entries.length === 0) return apiError("Bo'sh ro'yxat", 400);
    const day = dateOnly(date);
    await assertMonthOpen(date.slice(0, 7));

    for (const e of entries) {
      if (e.status !== null && !(e.status in ATTENDANCE_LABELS)) return apiError(`Holat noto'g'ri: ${e.status}`, 400);
      for (const t of [e.checkIn, e.checkOut]) {
        if (t && !TIME_RE.test(t)) return apiError(`Vaqt noto'g'ri: ${t} (masalan 08:00)`, 400);
      }
    }

    await db.$transaction(entries.map((e) =>
      e.status === null
        ? db.attendance.deleteMany({ where: { employeeId: e.employeeId, date: day } })
        : db.attendance.upsert({
            where: { employeeId_date: { employeeId: e.employeeId, date: day } },
            create: {
              employeeId: e.employeeId, date: day, status: e.status,
              checkIn: e.checkIn || null, checkOut: e.checkOut || null, note: e.note || null,
              markedById: user.id,
            },
            update: {
              status: e.status, checkIn: e.checkIn || null, checkOut: e.checkOut || null,
              note: e.note || null, markedById: user.id,
            },
          }),
    ));
    return apiSuccess({ saved: entries.length });
  } catch (e) {
    if (e instanceof MonthLockedError) return apiError(e.message, 409);
    return handleApiError(e);
  }
}
