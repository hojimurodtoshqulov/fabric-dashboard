import type { Employee, PayType } from "@prisma/client";
import { db } from "@/lib/db";
import { permissionsFor } from "@/lib/auth/access";
import type { Permission } from "@/constants";

export function can(role: string | undefined, permission: Permission): boolean {
  return permissionsFor(role).includes(permission);
}

/** Salary figures are visible only to payroll roles (director, accountant), not the foreman. */
export function presentEmployee(e: Employee, showPay: boolean) {
  const { baseSalary, dailyRate, ...rest } = e;
  return showPay
    ? { ...rest, baseSalary: Number(baseSalary), dailyRate: Number(dailyRate) }
    : { ...rest, baseSalary: null, dailyRate: null };
}

const PAY_TYPES: PayType[] = ["MONTHLY", "DAILY", "PIECE"];

export function parsePayType(v: unknown): PayType | undefined {
  return PAY_TYPES.includes(v as PayType) ? (v as PayType) : undefined;
}

/** Non-negative money amount from user input ("1 400 000", 1400000) or undefined. */
export function parseAmount(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Throws if the month's payroll is approved or paid — its inputs are frozen then. */
export async function assertMonthOpen(month: string) {
  const p = await db.payroll.findUnique({ where: { month }, select: { status: true } });
  if (p && p.status !== "DRAFT") {
    throw new MonthLockedError(month);
  }
}

export class MonthLockedError extends Error {
  constructor(month: string) {
    super(`${month} oyi oyligi tasdiqlangan — o'zgartirib bo'lmaydi`);
  }
}
