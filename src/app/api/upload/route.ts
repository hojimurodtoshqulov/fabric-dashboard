import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/auth/server";

const ALLOWED_AUDIO = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm", "audio/mp4"];
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "Fayl tanlanmagan" }, { status: 400 });
    if (!ALLOWED_AUDIO.includes(file.type)) return NextResponse.json({ error: "Faqat audio fayl (.mp3, .wav, .ogg)" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "Fayl 20MB dan oshmasligi kerak" }, { status: 400 });

    const ext = file.name.split(".").pop() ?? "mp3";
    const filename = `${randomUUID()}.${ext}`;
    const dir = join(process.cwd(), "public", "uploads", "audio");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ url: `/uploads/audio/${filename}` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Xatolik" }, { status: 500 });
  }
}
