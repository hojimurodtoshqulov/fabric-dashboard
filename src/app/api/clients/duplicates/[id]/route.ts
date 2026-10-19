import { type NextRequest } from "next/server";
import { requirePermission, createAuditLog } from "@/lib/auth/server";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/api";
import { mergeCandidate, rejectCandidate } from "@/services/crm/client-merge.service";

/** { action: "merge" } — same business: fold the potential copy into the 1C client.
 *  { action: "reject" } — different businesses: never suggest this pair again. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("clients:delete");
    const { id } = await params;
    const { action } = await req.json();

    if (action === "merge") {
      await mergeCandidate(id, user.id);
    } else if (action === "reject") {
      await rejectCandidate(id, user.id);
    } else {
      return apiError("action: merge | reject", 400);
    }

    await createAuditLog(user.id, "UPDATE", "client_match", id, null, { action }, req);
    return apiSuccess({ id, action });
  } catch (e) {
    return handleApiError(e);
  }
}
