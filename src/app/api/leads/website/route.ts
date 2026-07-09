// Public endpoint — no auth required, called by external website form
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, province, message } = body as {
      name?: string;
      phone?: string;
      province?: string;
      message?: string;
    };

    if (!message && !phone) {
      return NextResponse.json({ success: false, error: "message yoki phone kerak" }, { status: 400 });
    }

    const lead = await (db as any).lead.create({
      data: {
        source:   "WEBSITE",
        name:     name   || null,
        phone:    phone  || null,
        province: province || null,
        message:  message || `Saytdan zayavka: ${name ?? ""} ${phone ?? ""}`.trim(),
        status:   "NEW",
        metadata: { ip: req.headers.get("x-forwarded-for") ?? "unknown" },
      },
    });

    return NextResponse.json({ success: true, id: lead.id });
  } catch (e) {
    console.error("[leads/website]", e);
    return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
  }
}

// CORS preflight for cross-origin website requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
