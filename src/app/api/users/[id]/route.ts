import { type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requirePermission, createAuditLog } from "@/lib/auth/server";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/api";
import { isRoleName } from "@/constants";

/** Change login, role, block/unblock, rename, reset password. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requirePermission("users:update");
    const { id } = await params;
    const { name, email, phone, role, isActive, password } = await req.json();

    const target = await db.user.findUnique({ where: { id }, include: { role: true } });
    if (!target) return apiError("Foydalanuvchi topilmadi", 404);

    // The owner must not lock themselves out
    if (id === me.id && (isActive === false || (role !== undefined && role !== target.role.name))) {
      return apiError("O'zingizni bloklay yoki rolingizni o'zgartira olmaysiz", 400);
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = String(name).trim();
    if (email !== undefined) {
      // The login is the email column; sign-in matches it case-insensitively, so keep it unique that way too
      const login = String(email).trim().toLowerCase();
      if (!login) return apiError("Login bo'sh bo'lmasin", 400);
      if (login.length > 100 || /\s/.test(login)) return apiError("Login bo'sh joysiz, 100 belgigacha bo'lsin", 400);
      const taken = await db.user.findFirst({
        where: { email: { equals: login, mode: "insensitive" }, id: { not: id } },
        select: { id: true },
      });
      if (taken) return apiError("Bu login band", 409);
      if (login !== target.email) data.email = login;
    }
    if (phone !== undefined) data.phone = phone?.trim() || null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (role !== undefined) {
      if (!isRoleName(role)) return apiError("Rol noto'g'ri", 400);
      const roleRow = await db.role.findUnique({ where: { name: role } });
      if (!roleRow) return apiError("Rol bazada topilmadi", 400);
      data.roleId = roleRow.id;
    }
    if (password !== undefined) {
      if (String(password).length < 6) return apiError("Parol kamida 6 belgi bo'lsin", 400);
      data.password = await bcrypt.hash(String(password), 10);
    }

    const user = await db.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, phone: true, isActive: true, role: { select: { name: true, displayName: true } } },
    });
    const logged = { ...data, password: undefined, passwordReset: password !== undefined };
    await createAuditLog(me.id, "UPDATE", "user", id, null, logged, req);
    return apiSuccess({ user });
  } catch (e) {
    return handleApiError(e);
  }
}
