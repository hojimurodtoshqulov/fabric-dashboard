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
    const province = searchParams.get("province") || undefined;

    const result = await callService.list({ page, limit, clientId, status, province });
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
      callMode?: "TEMPLATE" | "AI_DYNAMIC" | "AI_CONVERSATION";
      voiceTemplateId?: string;
      scheduledAt?: string;
      context?: Record<string, unknown>;
    };

    const callMode = body.callMode ?? "TEMPLATE";

    if (callMode === "TEMPLATE") {
      const { scheduleTemplateCall } = await import("@/lib/queue");
      const call = await callService.initiateCall({
        clientId: body.clientId,
        purpose: body.purpose,
        initiatedById: user.id,
        callMode,
        voiceTemplateId: body.voiceTemplateId,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      });

      const client = await import("@/lib/db").then((m) => m.db.client.findUnique({ where: { id: body.clientId }, select: { name: true, phone: true } }));
      if (client?.phone) {
        let audioFileUrl: string | undefined;
        let dtmfConfig = null;
        if (body.voiceTemplateId) {
          const rows = await import("@/lib/db").then((m) =>
            m.db.$queryRaw<{ audioFileUrl: string | null; dtmfConfig: unknown }[]>`
              SELECT "audioFileUrl", "dtmfConfig" FROM voice_templates WHERE id = ${body.voiceTemplateId} LIMIT 1
            `
          );
          audioFileUrl = rows[0]?.audioFileUrl ?? undefined;
          dtmfConfig = rows[0]?.dtmfConfig ?? null;
        }
        await scheduleTemplateCall({
          callId: call.id,
          clientId: body.clientId,
          clientName: client.name,
          clientPhone: client.phone,
          purpose: body.purpose,
          callMode,
          voiceTemplateId: body.voiceTemplateId,
          audioFileUrl,
          dtmfConfig: dtmfConfig as import("@/types").DtmfConfig | null,
          context: {},
          attempt: 1,
          maxAttempts: 3,
        }).catch(console.warn);
      }
      return apiCreated(call);
    }

    // AI_DYNAMIC / AI_CONVERSATION — existing flow
    const call = await callService.initiateCall({
      ...body,
      initiatedById: user.id,
      callMode,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    });
    return apiCreated(call);
  } catch (e) {
    return handleApiError(e);
  }
}
