import { type NextRequest } from "next/server";
import { callService } from "@/services/calls/call.service";
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/api";
import { db } from "@/lib/db";
import type { CallPurpose } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("calls:read");
    const { id } = await params;
    const call = await callService.getById(id);
    if (!call) return apiError("Topilmadi", 404);
    return apiSuccess(call);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("calls:create");
    const { id } = await params;
    await db.call.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("calls:create");
    const { id } = await params;
    const body = await req.json() as { purpose?: CallPurpose; status?: string };

    const call = await db.call.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!call) return apiError("Topilmadi", 404);

    const updated = await db.call.update({
      where: { id },
      data: {
        ...(body.purpose && { purpose: body.purpose }),
        ...(body.status && { status: body.status as Parameters<typeof db.call.update>[0]["data"]["status"] }),
      },
    });
    return apiSuccess(updated);
  } catch (e) {
    return handleApiError(e);
  }
}
