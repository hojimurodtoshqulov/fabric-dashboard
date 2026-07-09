import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

const VALID_CATS = ["RAW_MATERIAL", "FINISHED_PRODUCT", "PACKAGING", "CHEMICAL", "OTHER"];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const { id } = await params;

  try {
    const [item] = await db.$queryRaw<any[]>`
      SELECT wi.*, wi."costPrice"::float AS "costPrice", wi."salePrice"::float AS "salePrice",
             wi."currentStock"::float AS "currentStock", wi."minStock"::float AS "minStock",
             s.id AS sup_id, s.name AS sup_name, s.phone AS sup_phone
      FROM "warehouse_items" wi
      LEFT JOIN "suppliers" s ON s.id = wi."supplierId"
      WHERE wi.id = ${id}
    `;
    if (!item) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    const movements = await db.$queryRaw<any[]>`
      SELECT sm.*, sm.quantity::float AS quantity, sm."unitPrice"::float AS "unitPrice",
             sm."totalAmount"::float AS "totalAmount", sm.type::text AS type,
             s.id AS sup_id, s.name AS sup_name,
             c.id AS cli_id, c.name AS cli_name
      FROM "stock_movements" sm
      LEFT JOIN "suppliers" s ON s.id = sm."supplierId"
      LEFT JOIN "clients"   c ON c.id = sm."clientId"
      WHERE sm."itemId" = ${id}
      ORDER BY sm."createdAt" DESC LIMIT 20
    `;

    return NextResponse.json({
      success: true,
      data: {
        item: {
          ...item,
          supplier:  item.sup_id ? { id: item.sup_id, name: item.sup_name, phone: item.sup_phone } : null,
          movements: movements.map(m => ({
            ...m,
            supplier: m.sup_id ? { id: m.sup_id, name: m.sup_name } : null,
            client:   m.cli_id ? { id: m.cli_id, name: m.cli_name } : null,
          })),
        },
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const { id } = await params;

  try {
    const body = await req.json();
    const { name, sku, unit, category, description, costPrice, salePrice, minStock, currentStock, supplierId } = body;

    const sets: Prisma.Sql[] = [Prisma.sql`"updatedAt" = NOW()`];
    if (name        !== undefined) sets.push(Prisma.sql`name = ${name}`);
    if (sku         !== undefined) sets.push(Prisma.sql`sku = ${sku || null}`);
    if (unit        !== undefined) sets.push(Prisma.sql`unit = ${unit}`);
    if (category    !== undefined && VALID_CATS.includes(category))
      sets.push(Prisma.sql`category = ${category}::"ItemCategory"`);
    if (description !== undefined) sets.push(Prisma.sql`description = ${description || null}`);
    if (costPrice    !== undefined) sets.push(Prisma.sql`"costPrice"    = ${parseFloat(costPrice)}`);
    if (salePrice    !== undefined) sets.push(Prisma.sql`"salePrice"    = ${parseFloat(salePrice)}`);
    if (minStock     !== undefined) sets.push(Prisma.sql`"minStock"     = ${parseFloat(minStock)}`);
    if (currentStock !== undefined) sets.push(Prisma.sql`"currentStock" = ${parseFloat(currentStock)}`);
    if (supplierId   !== undefined) sets.push(Prisma.sql`"supplierId"   = ${supplierId || null}`);

    const [item] = await db.$queryRaw<any[]>(
      Prisma.sql`UPDATE "warehouse_items" SET ${Prisma.join(sets, ", ")} WHERE id = ${id} RETURNING *`
    );

    return NextResponse.json({ success: true, data: { item } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const { id } = await params;

  try {
    const [{ cnt }] = await db.$queryRaw<[{ cnt: bigint }]>`
      SELECT COUNT(*)::bigint AS cnt FROM "stock_movements" WHERE "itemId" = ${id}
    `;
    if (Number(cnt) > 0) {
      return NextResponse.json({ error: "Bu mahsulotda harakatlar mavjud, o'chirib bo'lmaydi" }, { status: 409 });
    }
    await db.$executeRaw`DELETE FROM "warehouse_items" WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}
