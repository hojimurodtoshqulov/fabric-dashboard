import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

const VALID_TYPES = ["IN", "OUT", "PRODUCTION_USE", "PRODUCTION_OUTPUT", "ADJUSTMENT"];

export async function GET(req: NextRequest) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const type       = searchParams.get("type")       || null;
  const itemId     = searchParams.get("itemId")     || null;
  const supplierId = searchParams.get("supplierId") || null;
  const from       = searchParams.get("from")       || null;
  const to         = searchParams.get("to")         || null;
  const page  = Math.max(1, Number(searchParams.get("page")  ?? 1));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 30));
  const skip  = (page - 1) * limit;

  try {
    const conditions: Prisma.Sql[] = [];
    if (type && VALID_TYPES.includes(type)) conditions.push(Prisma.sql`sm.type = ${type}::"MovementType"`);
    if (itemId)     conditions.push(Prisma.sql`sm."itemId" = ${itemId}`);
    if (supplierId) conditions.push(Prisma.sql`sm."supplierId" = ${supplierId}`);
    if (from)       conditions.push(Prisma.sql`sm."createdAt" >= ${new Date(from)}`);
    if (to)         conditions.push(Prisma.sql`sm."createdAt" <= ${new Date(to + "T23:59:59")}`);

    const where = conditions.length
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty;

    const movements = await db.$queryRaw<any[]>(Prisma.sql`
      SELECT
        sm.id, sm.type::text AS type, sm."itemId", sm."invoiceNo", sm.note,
        sm.quantity::float    AS quantity,
        sm."unitPrice"::float AS "unitPrice",
        sm."totalAmount"::float AS "totalAmount",
        sm."supplierId", sm."clientId", sm."createdById", sm."productionLogId",
        sm."createdAt",
        wi.name AS item_name, wi.unit AS item_unit,
        s.id    AS sup_id,    s.name AS sup_name,
        c.id    AS cli_id,    c.name AS cli_name,
        u.id    AS usr_id,    u.name AS usr_name
      FROM "stock_movements" sm
      LEFT JOIN "warehouse_items" wi ON wi.id = sm."itemId"
      LEFT JOIN "suppliers"       s  ON s.id  = sm."supplierId"
      LEFT JOIN "clients"         c  ON c.id  = sm."clientId"
      LEFT JOIN "users"           u  ON u.id  = sm."createdById"
      ${where}
      ORDER BY sm."createdAt" DESC
      LIMIT ${limit} OFFSET ${skip}
    `);

    const [{ cnt }] = await db.$queryRaw<[{ cnt: bigint }]>(
      Prisma.sql`SELECT COUNT(*)::bigint AS cnt FROM "stock_movements" sm ${where}`
    );

    const formatted = movements.map(m => ({
      id: m.id, type: m.type, itemId: m.itemId, invoiceNo: m.invoiceNo, note: m.note,
      quantity: m.quantity, unitPrice: m.unitPrice, totalAmount: m.totalAmount,
      supplierId: m.supplierId, clientId: m.clientId, createdAt: m.createdAt,
      item:      { id: m.itemId,  name: m.item_name, unit: m.item_unit },
      supplier:  m.sup_id ? { id: m.sup_id, name: m.sup_name } : null,
      client:    m.cli_id ? { id: m.cli_id, name: m.cli_name } : null,
      createdBy: m.usr_id ? { id: m.usr_id, name: m.usr_name } : null,
    }));

    return NextResponse.json({ success: true, data: { movements: formatted, total: Number(cnt), page } });
  } catch (e: any) {
    console.error("[warehouse/movements GET]", e);
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let user: any;
  try { user = await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const body = await req.json();
    const { type, itemId, quantity, unitPrice, supplierId, invoiceNo, clientId, note } = body;

    if (!type || !itemId || !quantity) {
      return NextResponse.json({ error: "type, itemId, quantity majburiy" }, { status: 400 });
    }
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Noto'g'ri harakat turi" }, { status: 400 });
    }

    const qty   = parseFloat(quantity);
    const price = parseFloat(unitPrice ?? 0);
    const total = qty * price;

    // Check item + stock
    const [item] = await db.$queryRaw<any[]>`
      SELECT id, name, unit, "currentStock"::float AS "currentStock"
      FROM "warehouse_items" WHERE id = ${itemId}
    `;
    if (!item) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });

    if ((type === "OUT" || type === "PRODUCTION_USE") && item.currentStock < qty) {
      return NextResponse.json({
        error: `Yetarli miqdor yo'q. Mavjud: ${item.currentStock} ${item.unit}`,
      }, { status: 400 });
    }

    const isIncoming = type === "IN" || type === "PRODUCTION_OUTPUT";
    const delta      = isIncoming ? qty : -qty;
    const id         = randomUUID();

    await db.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "stock_movements"
          (id, type, "itemId", quantity, "unitPrice", "totalAmount",
           "supplierId", "invoiceNo", "clientId", note, "createdById", "createdAt")
        VALUES (
          ${id}, ${type}::"MovementType", ${itemId}, ${qty}, ${price}, ${total},
          ${supplierId || null}, ${invoiceNo || null}, ${clientId || null},
          ${note || null}, ${user.id}, NOW()
        )
      `;
      await tx.$executeRaw`
        UPDATE "warehouse_items"
        SET "currentStock" = "currentStock" + ${delta}, "updatedAt" = NOW()
        WHERE id = ${itemId}
      `;
    });

    const [movement] = await db.$queryRaw<any[]>`
      SELECT sm.*, sm.quantity::float AS quantity, sm."unitPrice"::float AS "unitPrice",
             sm."totalAmount"::float AS "totalAmount", sm.type::text AS type,
             wi.name AS item_name, wi.unit AS item_unit,
             s.name AS sup_name
      FROM "stock_movements" sm
      LEFT JOIN "warehouse_items" wi ON wi.id = sm."itemId"
      LEFT JOIN "suppliers"       s  ON s.id  = sm."supplierId"
      WHERE sm.id = ${id}
    `;

    return NextResponse.json({ success: true, data: { movement } }, { status: 201 });
  } catch (e: any) {
    console.error("[warehouse/movements POST]", e);
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}
