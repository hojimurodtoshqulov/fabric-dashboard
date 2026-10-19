import { type NextRequest } from "next/server";
import { clientService } from "@/services/crm/client.service";
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, apiCreated, apiError, handleApiError, getPaginationParams } from "@/lib/utils/api";
import { createAuditLog } from "@/lib/auth/server";
import { buildProvinceWhere } from "@/lib/provinces";
import type { ClientStatus } from "@/constants";
import { isCategory, MANUAL_SOURCE_OPTIONS } from "@/lib/clients/category";
import { pickAutoMerge } from "@/lib/clients/matching";
import { loadOneCIndex, queueReviewForNewClients } from "@/services/crm/client-merge.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("clients:read");
    const { page, limit, search, sortBy, sortOrder } = getPaginationParams(req.url);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as ClientStatus | null;
    const segmentId = searchParams.get("segmentId") || undefined;
    const categoryParam = searchParams.get("category");
    const category = isCategory(categoryParam) ? categoryParam : undefined;
    const region = searchParams.get("region") || undefined;
    const provinceKey = searchParams.get("province") || undefined;
    const provinceWhere = provinceKey ? buildProvinceWhere(provinceKey) : undefined;

    const result = await clientService.list({
      page, limit, search, sortBy, sortOrder,
      ...(status && { status }),
      category,
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

    // Only the 1C sync makes faol clients; anything added here is potensial or yangi.
    const source = MANUAL_SOURCE_OPTIONS.some(o => o.value === body.source) ? body.source : "MANUAL";
    const status = body.status && body.status !== "ACTIVE" && body.status !== "DEBTOR" ? body.status : "PROSPECT";

    // A business already buying from us must not land in the potential list — it would
    // get "meet our prices" campaigns meant for strangers.
    const onecIndex = await loadOneCIndex();
    const dup = pickAutoMerge(onecIndex.find({ name: body.name ?? "", phone: body.phone }));
    if (dup) {
      return apiError(`Bu mijoz 1C da faol mijoz sifatida mavjud: ${dup.target.name}`, 409);
    }

    const client = await clientService.create({
      ...body,
      source,
      status,
      createdById: user.id,
    });
    await queueReviewForNewClients([client.id], onecIndex);

    await createAuditLog(user.id, "CREATE", "client", client.id, null, client, req);
    return apiCreated(client);
  } catch (e) {
    return handleApiError(e);
  }
}
