import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, apiCreated, handleApiError } from "@/lib/utils/api";
import { voiceTemplateService } from "@/services/voice-templates/voiceTemplate.service";
export async function GET() {
  try {
    await requirePermission("calls:read");
    const templates = await voiceTemplateService.list();
    return apiSuccess({ templates });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission("calls:create");
    const body = await req.json();
    const { name, type, title, description, audioFileUrl, dtmfConfig, isActive, sendSmsAfterCall, smsText } = body as {
      name: string;
      type: string;
      title: string;
      description?: string;
      audioFileUrl?: string;
      dtmfConfig?: object | null;
      isActive?: boolean;
      sendSmsAfterCall?: boolean;
      smsText?: string | null;
    };

    if (!name || !type || !title) {
      return handleApiError(Object.assign(new Error("name, type, title are required"), { code: "VALIDATION_ERROR" }));
    }

    const template = await voiceTemplateService.create({ name, type, title, description, audioFileUrl, dtmfConfig: dtmfConfig as import("@/types").DtmfConfig, isActive, sendSmsAfterCall, smsText });
    return apiCreated({ template });
  } catch (e) {
    return handleApiError(e);
  }
}
