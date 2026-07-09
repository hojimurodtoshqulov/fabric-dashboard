import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

const VALID_CATS = ["RAW_MATERIAL", "FINISHED_PRODUCT", "PACKAGING", "CHEMICAL", "OTHER"];

export async function GET(req: NextRequest) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || null;
  const search   = searchParams.get("search")   || null;
  const page  = Math.max(1, Number(searchParams.get("page")  ?? 1));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 50));
  const skip  = (page - 1) * limit;

  try {
    const conditions: Prisma.Sql[] = [];
    if (category && VALID_CATS.includes(category))
      conditions.push(Prisma.sql`wi.category = ${category}::"ItemCategory"`);
    if (search)
      conditions.push(Prisma.sql`(wi.name ILIKE ${"%" + search + "%"} OR wi.sku ILIKE ${"%" + search + "%"})`);

    const where = conditions.length
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty;

    const items = await db.$queryRaw<any[]>(
      Prisma.sql`
        SELECT
          wi.id, wi.name, wi.sku, wi.unit, wi.category::text,
          wi.description,
          wi."costPrice"::float    AS "costPrice",
          wi."salePrice"::float    AS "salePrice",
          wi."currentStock"::float AS "currentStock",
          wi."minStock"::float     AS "minStock",
          wi."supplierId",
          wi."createdAt", wi."updatedAt",
          s.id   AS sup_id,
          s.name AS sup_name
        FROM "warehouse_items" wi
        LEFT JOIN "suppliers" s ON s.id = wi."supplierId"
        ${where}
        ORDER BY wi.name ASC
        LIMIT ${limit} OFFSET ${skip}
      `
    );

    const [{ cnt }] = await db.$queryRaw<[{ cnt: bigint }]>(
      Prisma.sql`SELECT COUNT(*)::bigint AS cnt FROM "warehouse_items" wi ${where}`
    );

    const formatted = items.map(r => ({
      id: r.id, name: r.name, sku: r.sku, unit: r.unit, category: r.category,
      description: r.description, costPrice: r.costPrice, salePrice: r.salePrice,
      currentStock: r.currentStock, minStock: r.minStock, supplierId: r.supplierId,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
      supplier: r.sup_id ? { id: r.sup_id, name: r.sup_name } : null,
      _count: { movements: 0 },
    }));

    return NextResponse.json({ success: true, data: { items: formatted, total: Number(cnt), page } });
  } catch (e: any) {
    console.error("[warehouse/items GET]", e);
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const body = await req.json();
    const { name, sku, unit, category, description, costPrice, salePrice, minStock, currentStock, supplierId } = body;

    if (!name) return NextResponse.json({ error: "name majburiy" }, { status: 400 });

    const id  = randomUUID();
    const cat = VALID_CATS.includes(category) ? category : "RAW_MATERIAL";
    const cp  = parseFloat(costPrice    ?? 0);
    const sp  = parseFloat(salePrice    ?? 0);
    const ms  = parseFloat(minStock     ?? 0);
    const cs  = parseFloat(currentStock ?? 0);

    const [item] = await db.$queryRaw<any[]>`
      INSERT INTO "warehouse_items"
        (id, name, sku, unit, category, description,
         "costPrice", "salePrice", "currentStock", "minStock",
         "supplierId", "createdAt", "updatedAt")
      VALUES (
        ${id}, ${name}, ${sku || null}, ${unit || "kg"},
        ${cat}::"ItemCategory",
        ${description || null}, ${cp}, ${sp}, ${cs}, ${ms},
        ${supplierId || null}, NOW(), NOW()
      )
      RETURNING *,
        "costPrice"::float    AS "costPrice",
        "salePrice"::float    AS "salePrice",
        "currentStock"::float AS "currentStock",
        "minStock"::float     AS "minStock"
    `;

    return NextResponse.json({ success: true, data: { item } }, { status: 201 });
  } catch (e: any) {
    console.error("[warehouse/items POST]", e);
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}
