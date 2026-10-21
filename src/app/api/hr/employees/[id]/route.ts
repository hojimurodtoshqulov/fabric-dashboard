import { type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission, createAuditLog } from "@/lib/auth/server";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/api";
import { can, presentEmployee, parsePayType, parseAmount } from "@/lib/hr/server";
import { isDateString, dateOnly } from "@/lib/hr/shared";

/** Edit details; fire with { status: "FIRED", fireDate }; rehire with { status: "ACTIVE" }. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("employees:update");
    const { id } = await params;
    const body = await req.json();

    const data: Prisma.EmployeeUpdateInput = {};
    if (body.fullName !== undefined) {
      if (!String(body.fullName).trim()) return apiError("Ism familiya majburiy", 400);
      data.fullName = String(body.fullName).trim();
    }
    if (body.position !== undefined) data.position = String(body.position).trim();
    if (body.phone !== undefined) data.phone = body.phone?.trim() || null;
    if (body.department !== undefined) data.department = body.department?.trim() || null;
    if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
    if (body.hireDate !== undefined) {
      if (!isDateString(body.hireDate)) return apiError("Sana noto'g'ri", 400);
      data.hireDate = dateOnly(body.hireDate);
    }
    if (body.status === "FIRED") {
      data.status = "FIRED";
      data.fireDate = isDateString(body.fireDate) ? dateOnly(body.fireDate) : new Date();
    } else if (body.status === "ACTIVE") {
      data.status = "ACTIVE";
      data.fireDate = null;
    }

    const payFields = ["payType", "baseSalary", "dailyRate"].filter((k) => body[k] !== undefined);
    if (payFields.length) {
      if (!can(user.role, "payroll:update")) return apiError("Oylik shartlarini o'zgartirishga ruxsat yo'q", 403);
      if (body.payType !== undefined) {
        const t = parsePayType(body.payType);
        if (!t) return apiError("Oylik turi noto'g'ri", 400);
        data.payType = t;
      }
      if (body.baseSalary !== undefined) data.baseSalary = parseAmount(body.baseSalary) ?? 0;
      if (body.dailyRate !== undefined) data.dailyRate = parseAmount(body.dailyRate) ?? 0;
    }

    const employee = await db.employee.update({ where: { id }, data });
    await createAuditLog(user.id, "UPDATE", "employee", id, null, body, req);
    return apiSuccess({ employee: presentEmployee(employee, can(user.role, "payroll:read")) });
  } catch (e) {
    return handleApiError(e);
  }
}
