import { auth } from "@/lib/auth";
import { ROLE_PERMISSIONS } from "@/constants";
import type { Permission, RoleName } from "@/constants";
import { db } from "@/lib/db";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user) return null;
  return session.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireAuth();
  const perms = ROLE_PERMISSIONS[user.role as RoleName] || [];
  if (!perms.includes(permission)) throw new Error("FORBIDDEN");
  return user;
}

export async function requireRole(...roles: RoleName[]) {
  const user = await requireAuth();
  if (!roles.includes(user.role as RoleName)) throw new Error("FORBIDDEN");
  return user;
}

export async function createAuditLog(
  userId: string,
  action: string,
  resource: string,
  resourceId?: string,
  oldData?: unknown,
  newData?: unknown,
  request?: Request
) {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        oldData: oldData ? (oldData as object) : undefined,
        newData: newData ? (newData as object) : undefined,
        ipAddress: request?.headers.get("x-forwarded-for") ?? undefined,
        userAgent: request?.headers.get("user-agent") ?? undefined,
      },
    });
  } catch {
    // Non-blocking
  }
}
