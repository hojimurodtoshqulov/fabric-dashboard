import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db as prisma } from "@/lib/db";

export async function GET(_req: NextRequest) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const settings = await prisma.setting.findMany({
    orderBy: { key: "asc" },
  });

  return NextResponse.json({ success: true, data: { settings } });
}

export async function PUT(req: NextRequest) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const body = await req.json();
  const { settings } = body as { settings: Array<{ key: string; value: string }> };

  if (!Array.isArray(settings)) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  await Promise.all(
    settings.map(({ key, value }) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );

  return NextResponse.json({ success: true });
}
