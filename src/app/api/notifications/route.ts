import { type NextRequest } from "next/server";
import { notificationService } from "@/services/notifications/notification.service";
import { requireAuth } from "@/lib/auth/server";
import { apiSuccess, handleApiError, getPaginationParams } from "@/lib/utils/api";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { page, limit } = getPaginationParams(req.url);
    const result = await notificationService.list(user.id, page, limit);
    return apiSuccess(result);
  } catch (e) {
    return handleApiError(e);
  }
}
