import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, handleApiError } from "@/lib/utils/api";
import { getOneCStatus } from "@/services/sync/onec-status.service";

/** 1C sync health and the latest changes it brought in, for the Settings page. */
export async function GET() {
  try {
    await requirePermission("settings:read");
    return apiSuccess(await getOneCStatus());
  } catch (e) {
    return handleApiError(e);
  }
}
