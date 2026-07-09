import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, handleApiError } from "@/lib/utils/api";
import { voiceTemplateService } from "@/services/voice-templates/voiceTemplate.service";
import path from "path";
import fs from "fs/promises";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");
const TEMPLATES_DIR = path.join(UPLOAD_DIR, "templates");

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("calls:create");
    const { id } = await params;

    const formData = await req.formData();
    const file = formData.get("audio") as File | null;
    if (!file) return handleApiError(Object.assign(new Error("No audio file provided"), { code: "VALIDATION_ERROR" }));

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["mp3", "wav", "ogg", "m4a"].includes(ext ?? "")) {
      return handleApiError(Object.assign(new Error("Only mp3, wav, ogg, m4a files allowed"), { code: "VALIDATION_ERROR" }));
    }

    await fs.mkdir(TEMPLATES_DIR, { recursive: true });
    const filename = `template-${id}-${Date.now()}.${ext}`;
    const filepath = path.join(TEMPLATES_DIR, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filepath, buffer);

    const audioFileUrl = `/uploads/templates/${filename}`;
    const template = await voiceTemplateService.setAudioUrl(id, audioFileUrl);
    return apiSuccess({ template, audioFileUrl });
  } catch (e) {
    return handleApiError(e);
  }
}
