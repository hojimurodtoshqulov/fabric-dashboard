import { type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission, createAuditLog } from "@/lib/auth/server";
import { apiSuccess, apiCreated, apiError, handleApiError } from "@/lib/utils/api";
import { can, presentEmployee, parsePayType, parseAmount } from "@/lib/hr/server";
import { isDateString, dateOnly } from "@/lib/hr/shared";

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("employees:read");
    const sp = new URL(req.url).searchParams;
    const status = sp.get("status") === "FIRED" ? "FIRED" : sp.get("status") === "all" ? undefined : "ACTIVE";
    const search = sp.get("search")?.trim();
    const department = sp.get("department") || undefined;

    const where: Prisma.EmployeeWhereInput = {
      ...(status && { status }),
      ...(department && { department }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { position: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
        ],
      }),
    };

    const [employees, departments, counts] = await Promise.all([
      db.employee.findMany({ where, orderBy: [{ department: "asc" }, { fullName: "asc" }] }),
      db.employee.groupBy({ by: ["department"], where: { status: "ACTIVE" }, _count: { id: true } }),
      db.employee.groupBy({ by: ["status"], _count: { id: true } }),
    ]);

    const showPay = can(user.role, "payroll:read");
    return apiSuccess({
      employees: employees.map((e) => presentEmployee(e, showPay)),
      departments: departments
        .filter((d) => d.department)
        .map((d) => ({ name: d.department!, count: d._count.id }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      active: counts.find((c) => c.status === "ACTIVE")?._count.id ?? 0,
      fired: counts.find((c) => c.status === "FIRED")?._count.id ?? 0,
      canSeePay: showPay,
      canEditPay: can(user.role, "payroll:update"),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("employees:update");
    const body = await req.json();

    if (!body.fullName?.trim()) return apiError("Ism familiya majburiy", 400);
    if (!body.position?.trim()) return apiError("Lavozim majburiy", 400);
    if (!isDateString(body.hireDate)) return apiError("Ishga kirgan sana noto'g'ri", 400);

    // Pay terms are set by payroll roles only; a foreman's new hire starts without them.
    const editPay = can(user.role, "payroll:update");
    const employee = await db.employee.create({
      data: {
        fullName: body.fullName.trim(),
        phone: body.phone?.trim() || null,
        position: body.position.trim(),
        department: body.department?.trim() || null,
        hireDate: dateOnly(body.hireDate),
        notes: body.notes?.trim() || null,
        ...(editPay && {
          payType: parsePayType(body.payType) ?? "MONTHLY",
          baseSalary: parseAmount(body.baseSalary) ?? 0,
          dailyRate: parseAmount(body.dailyRate) ?? 0,
        }),
      },
    });
    await createAuditLog(user.id, "CREATE", "employee", employee.id, null, { fullName: employee.fullName }, req);
    return apiCreated({ employee: presentEmployee(employee, can(user.role, "payroll:read")) });
  } catch (e) {
    return handleApiError(e);
  }
}
