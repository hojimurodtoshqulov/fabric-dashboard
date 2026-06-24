import { type NextRequest } from "next/server";
import { clientService } from "@/services/crm/client.service";
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/api";
import { createAuditLog } from "@/lib/auth/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("clients:read");
    const { id } = await params;
    const client = await clientService.getById(id);
    if (!client) return apiError("Client not found", 404);
    return apiSuccess(client);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("clients:update");
    const { id } = await params;
    const body = await req.json();
    const old = await clientService.getById(id);

    const updated = await clientService.update(id, body);
    await createAuditLog(user.id, "UPDATE", "client", id, old, updated, req);
    return apiSuccess(updated);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("clients:delete");
    const { id } = await params;
    await clientService.delete(id);
    await createAuditLog(user.id, "DELETE", "client", id, null, null, req);
    return apiSuccess({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
