import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, handleApiError } from "@/lib/utils/api";
import { voiceTemplateService } from "@/services/voice-templates/voiceTemplate.service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("calls:read");
    const { id } = await params;
    const template = await voiceTemplateService.getById(id);
    if (!template) return handleApiError(Object.assign(new Error("Not found"), { code: "NOT_FOUND" }));
    return apiSuccess({ template });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("calls:create");
    const { id } = await params;
    const body = await req.json();
    const template = await voiceTemplateService.update(id, body);
    return apiSuccess({ template });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("calls:create");
    const { id } = await params;
    await voiceTemplateService.delete(id);
    return apiSuccess({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
