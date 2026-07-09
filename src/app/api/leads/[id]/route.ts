import { type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, handleApiError } from "@/lib/utils/api";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("messages:send");

    const { id }  = await params;
    const body    = await req.json();
    const { status, notes, assignedToId, clientId } = body;

    const updateData: Record<string, unknown> = {};
    if (status !== undefined)       updateData.status       = status;
    if (notes !== undefined)        updateData.notes        = notes;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (clientId !== undefined)     updateData.clientId     = clientId;

    const lead = await (db as any).lead.update({
      where: { id },
      data:  updateData,
      include: {
        client:     { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return apiSuccess({ lead });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("messages:send");
    const { id } = await params;
    await (db as any).lead.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
