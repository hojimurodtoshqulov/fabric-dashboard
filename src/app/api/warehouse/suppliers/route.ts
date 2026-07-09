import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || null;

  try {
    const conditions: Prisma.Sql[] = [Prisma.sql`s."isActive" = true`];
    if (search) {
      const like = "%" + search + "%";
      conditions.push(Prisma.sql`(s.name ILIKE ${like} OR s.company ILIKE ${like} OR s.phone ILIKE ${like})`);
    }
    const where = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

    const suppliers = await db.$queryRaw<any[]>(Prisma.sql`
      SELECT s.*,
        (SELECT COUNT(*) FROM "stock_movements" sm WHERE sm."supplierId" = s.id)::int AS mov_count,
        (SELECT COUNT(*) FROM "warehouse_items"  wi WHERE wi."supplierId" = s.id)::int AS item_count
      FROM "suppliers" s
      ${where}
      ORDER BY s.name ASC
    `);

    const formatted = suppliers.map(s => ({
      id: s.id, name: s.name, company: s.company, phone: s.phone,
      region: s.region, inn: s.inn, notes: s.notes, isActive: s.isActive,
      createdAt: s.createdAt, updatedAt: s.updatedAt,
      _count: { movements: s.mov_count, items: s.item_count },
    }));

    return NextResponse.json({ success: true, data: { suppliers: formatted } });
  } catch (e: any) {
    console.error("[warehouse/suppliers GET]", e);
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const body = await req.json();
    const { id: existingId, name, company, phone, region, inn, notes } = body;

    if (!name) return NextResponse.json({ error: "name majburiy" }, { status: 400 });

    if (existingId) {
      // Update
      const sets: Prisma.Sql[] = [
        Prisma.sql`"updatedAt" = NOW()`,
        Prisma.sql`name = ${name}`,
        Prisma.sql`company = ${company || null}`,
        Prisma.sql`phone = ${phone || null}`,
        Prisma.sql`region = ${region || null}`,
        Prisma.sql`inn = ${inn || null}`,
        Prisma.sql`notes = ${notes || null}`,
      ];
      const [supplier] = await db.$queryRaw<any[]>(
        Prisma.sql`UPDATE "suppliers" SET ${Prisma.join(sets, ", ")} WHERE id = ${existingId} RETURNING *`
      );
      return NextResponse.json({ success: true, data: { supplier } });
    }

    // Create
    const id = randomUUID();
    const [supplier] = await db.$queryRaw<any[]>`
      INSERT INTO "suppliers" (id, name, company, phone, region, inn, notes, "isActive", "createdAt", "updatedAt")
      VALUES (${id}, ${name}, ${company || null}, ${phone || null}, ${region || null}, ${inn || null}, ${notes || null}, true, NOW(), NOW())
      RETURNING *
    `;
    return NextResponse.json({ success: true, data: { supplier } }, { status: 201 });
  } catch (e: any) {
    console.error("[warehouse/suppliers POST]", e);
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}
