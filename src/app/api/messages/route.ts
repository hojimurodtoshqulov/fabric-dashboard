import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db as prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const clientId = searchParams.get("clientId");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (type) where.channel = type; // "type" param maps to channel (TELEGRAM/SMS/EMAIL)
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true } },
        sentBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.message.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: { messages, total, page, totalPages: Math.ceil(total / limit) } });
}

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuth>>;
  try { user = await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const body = await req.json();
  const { channel = "TELEGRAM", msgType = "NOTIFICATION", body: content, clientId, to } = body;

  if (!content || !to) return NextResponse.json({ error: "Body and to required" }, { status: 400 });

  const message = await prisma.message.create({
    data: {
      channel,
      type: msgType,
      body: content,
      clientId,
      to,
      sentById: user.id,
    },
    include: {
      client: { select: { id: true, name: true } },
      sentBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ success: true, data: { message } }, { status: 201 });
}
