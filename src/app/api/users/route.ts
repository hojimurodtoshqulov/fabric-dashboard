import { type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requirePermission, createAuditLog } from "@/lib/auth/server";
import { apiSuccess, apiCreated, apiError, handleApiError } from "@/lib/utils/api";
import { isRoleName } from "@/constants";

const USER_SELECT = {
  id: true, name: true, email: true, phone: true, isActive: true, createdAt: true,
  role: { select: { name: true, displayName: true } },
} as const;

export async function GET() {
  try {
    await requirePermission("users:read");
    const users = await db.user.findMany({ select: USER_SELECT, orderBy: [{ isActive: "desc" }, { name: "asc" }] });
    return apiSuccess({ users });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await requirePermission("users:create");
    const { name, email, phone, password, role } = await req.json();

    if (!name?.trim() || !email?.trim()) return apiError("Ism va login (email) majburiy", 400);
    if (!password || String(password).length < 6) return apiError("Parol kamida 6 belgi bo'lsin", 400);
    if (!isRoleName(role)) return apiError("Rol noto'g'ri", 400);

    const login = String(email).trim().toLowerCase();
    if (await db.user.findUnique({ where: { email: login } })) {
      return apiError("Bu login band", 409);
    }
    const roleRow = await db.role.findUnique({ where: { name: role } });
    if (!roleRow) return apiError("Rol bazada topilmadi", 400);

    const user = await db.user.create({
      data: {
        name: String(name).trim(),
        email: login,
        phone: phone?.trim() || null,
        password: await bcrypt.hash(String(password), 10),
        roleId: roleRow.id,
      },
      select: USER_SELECT,
    });
    await createAuditLog(me.id, "CREATE", "user", user.id, null, { name: user.name, email: user.email, role }, req);
    return apiCreated({ user });
  } catch (e) {
    return handleApiError(e);
  }
}
