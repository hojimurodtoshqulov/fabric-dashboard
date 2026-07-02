import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const type     = searchParams.get("type");
  const status   = searchParams.get("status");
  const clientId = searchParams.get("clientId");
  const search   = searchParams.get("search") || undefined;
  const province = searchParams.get("province") || undefined;
  const page  = Math.max(1, Number(searchParams.get("page")  ?? 1));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
  const skip  = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (type)     where.channel  = type;
  if (status)   where.status   = status;
  if (clientId) where.clientId = clientId;
  if (province) where.client   = { province };
  if (search)   where.OR = [
    { body:   { contains: search, mode: "insensitive" } },
    { client: { name: { contains: search, mode: "insensitive" } } },
  ];

  const [messages, total] = await Promise.all([
    db.message.findMany({
      where,
      include: {
        client:  { select: { id: true, name: true, phone: true } },
        sentBy:  { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.message.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: { messages, total, page, totalPages: Math.ceil(total / limit) } });
}

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof requireAuth>>;
  try { user = await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const body = await req.json() as {
    channel?: string; msgType?: string; body?: string; clientId?: string; to?: string;
  };
  const { channel = "TELEGRAM", msgType = "NOTIFICATION", body: content, clientId, to } = body;

  if (!content || !to) return NextResponse.json({ error: "Body and to required" }, { status: 400 });

  const message = await db.message.create({
    data: { channel, type: msgType, body: content, clientId, to, sentById: user.id },
    include: {
      client: { select: { id: true, name: true } },
      sentBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ success: true, data: { message } }, { status: 201 });
}
