// HR helpers shared by server and client (no server-only imports).
import type { AttendanceStatus, PayAdjustmentType, PayType, PayrollStatus } from "@prisma/client";

export const PAY_TYPE_LABELS: Record<PayType, string> = {
  MONTHLY: "Belgilangan oylik",
  DAILY:   "Kunbay",
  PIECE:   "Ishbay",
};

export const ATTENDANCE_LABELS: Record<AttendanceStatus, { label: string; short: string; className: string }> = {
  PRESENT:  { label: "Keldi",         short: "✓",  className: "bg-green-500/15 text-green-300 border-green-800" },
  LATE:     { label: "Kechikdi",      short: "K",  className: "bg-amber-500/15 text-amber-300 border-amber-800" },
  HALF_DAY: { label: "Yarim kun",     short: "½",  className: "bg-sky-500/15 text-sky-300 border-sky-800" },
  ABSENT:   { label: "Kelmadi",       short: "✗",  className: "bg-red-500/15 text-red-300 border-red-800" },
  SICK:     { label: "Kasal",         short: "B",  className: "bg-purple-500/15 text-purple-300 border-purple-800" },
  VACATION: { label: "Ta'tilda",      short: "T",  className: "bg-indigo-500/15 text-indigo-300 border-indigo-800" },
  DAY_OFF:  { label: "Dam olish",     short: "–",  className: "bg-slate-500/15 text-slate-400 border-slate-700" },
};

/** How much of a paid working day each status counts for. */
export const PAID_DAY_WEIGHT: Record<AttendanceStatus, number> = {
  PRESENT: 1, LATE: 1, HALF_DAY: 0.5,
  ABSENT: 0, SICK: 0, VACATION: 0, DAY_OFF: 0,
};

export const ADJUSTMENT_LABELS: Record<PayAdjustmentType, string> = {
  BONUS:   "Bonus",
  PENALTY: "Jarima",
  ADVANCE: "Avans",
};

export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  DRAFT:    "Qoralama",
  APPROVED: "Tasdiqlangan",
  PAID:     "To'langan",
};

export const MONTH_NAMES = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
];

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isMonth(v: unknown): v is string {
  return typeof v === "string" && MONTH_RE.test(v);
}

export function isDateString(v: unknown): v is string {
  return typeof v === "string" && DATE_RE.test(v) && !Number.isNaN(Date.parse(v));
}

/** "2026-10" for a date (local time). */
export function monthOf(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function todayString(d = new Date()): string {
  return `${monthOf(d)}-${String(d.getDate()).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** @db.Date columns are compared as UTC midnight. */
export function dateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** [first day, first day of next month) in UTC. */
export function monthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Monday–Saturday count — the factory works a six-day week. */
export function defaultWorkingDays(month: string): number {
  const [y, m] = month.split("-").map(Number);
  let n = 0;
  for (let d = 1; d <= daysInMonth(month); d++) {
    if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() !== 0) n++;
  }
  return n;
}
