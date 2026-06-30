import { type NextRequest } from "next/server";
import { clientService } from "@/services/crm/client.service";
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, apiCreated, apiError, handleApiError, getPaginationParams } from "@/lib/utils/api";
import { createAuditLog } from "@/lib/auth/server";
import { buildProvinceWhere } from "@/lib/provinces";
import type { ClientStatus } from "@/constants";

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("clients:read");
    const { page, limit, search, sortBy, sortOrder } = getPaginationParams(req.url);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as ClientStatus | null;
    const segmentId = searchParams.get("segmentId") || undefined;
    const region = searchParams.get("region") || undefined;
    const provinceKey = searchParams.get("province") || undefined;
    const provinceWhere = provinceKey ? buildProvinceWhere(provinceKey) : undefined;

    const result = await clientService.list({
      page, limit, search, sortBy, sortOrder,
      ...(status && { status }),
      segmentId,
      region,
      provinceWhere,
    });

    return apiSuccess(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("clients:create");
    const body = await req.json();

    const client = await clientService.create({
      ...body,
      createdById: user.id,
    });

    await createAuditLog(user.id, "CREATE", "client", client.id, null, client, req);
    return apiCreated(client);
  } catch (e) {
    return handleApiError(e);
  }
}
