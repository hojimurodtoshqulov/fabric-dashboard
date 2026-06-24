import { type NextRequest } from "next/server";
import { callService } from "@/services/calls/call.service";
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, apiCreated, handleApiError, getPaginationParams } from "@/lib/utils/api";
import type { CallPurpose } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("calls:read");
    const { page, limit } = getPaginationParams(req.url);
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId") || undefined;
    const status = searchParams.get("status") || undefined;

    const result = await callService.list({ page, limit, clientId, status });
    return apiSuccess(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("calls:create");
    const body = await req.json() as {
      clientId: string;
      purpose: CallPurpose;
      scheduledAt?: string;
      context?: Record<string, unknown>;
    };

    const call = await callService.initiateCall({
      ...body,
      initiatedById: user.id,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    });
    return apiCreated(call);
  } catch (e) {
    return handleApiError(e);
  }
}
