import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";

export async function GET() {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      inventoryRows,
      todayInRows,
      todayOutRows,
      recentRows,
      lowStockRows,
    ] = await Promise.all([
      db.$queryRaw<any[]>`
        SELECT SUM("currentStock"::float * "costPrice"::float) AS total_value, COUNT(*)::int AS total_items
        FROM "warehouse_items"
      `,
      db.$queryRaw<any[]>`
        SELECT SUM("totalAmount"::float) AS amount, COUNT(*)::int AS cnt
        FROM "stock_movements"
        WHERE type = 'IN'::"MovementType" AND "createdAt" >= ${todayStart}
      `,
      db.$queryRaw<any[]>`
        SELECT SUM("totalAmount"::float) AS amount, COUNT(*)::int AS cnt
        FROM "stock_movements"
        WHERE type = 'OUT'::"MovementType" AND "createdAt" >= ${todayStart}
      `,
      db.$queryRaw<any[]>`
        SELECT
          sm.id, sm.type::text AS type, sm."itemId",
          sm.quantity::float AS quantity,
          sm."totalAmount"::float AS "totalAmount",
          sm."createdAt",
          wi.name AS item_name, wi.unit AS item_unit,
          s.name  AS sup_name,
          c.name  AS cli_name
        FROM "stock_movements" sm
        LEFT JOIN "warehouse_items" wi ON wi.id = sm."itemId"
        LEFT JOIN "suppliers"       s  ON s.id  = sm."supplierId"
        LEFT JOIN "clients"         c  ON c.id  = sm."clientId"
        ORDER BY sm."createdAt" DESC LIMIT 8
      `,
      db.$queryRaw<any[]>`
        SELECT id, name, unit, category::text AS category,
               "currentStock"::float AS "currentStock",
               "minStock"::float     AS "minStock"
        FROM "warehouse_items"
        WHERE "minStock" > 0 AND "currentStock" <= "minStock"
        ORDER BY ("currentStock" / NULLIF("minStock", 0)) ASC
        LIMIT 10
      `,
    ]);

    const inv = inventoryRows[0];
    const totalValue  = parseFloat(inv?.total_value ?? 0);
    const totalItems  = inv?.total_items ?? 0;

    const recentMovements = recentRows.map(m => ({
      id: m.id, type: m.type, quantity: m.quantity, totalAmount: m.totalAmount,
      createdAt: m.createdAt,
      item:     { id: m.itemId, name: m.item_name, unit: m.item_unit },
      supplier: m.sup_name ? { name: m.sup_name } : null,
      client:   m.cli_name ? { name: m.cli_name } : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalValue,
        totalItems,
        lowStockCount: lowStockRows.length,
        today: {
          in:  { amount: parseFloat(todayInRows[0]?.amount  ?? 0), count: todayInRows[0]?.cnt  ?? 0 },
          out: { amount: parseFloat(todayOutRows[0]?.amount ?? 0), count: todayOutRows[0]?.cnt ?? 0 },
        },
        recentMovements,
        lowStockItems: lowStockRows,
      },
    });
  } catch (e: any) {
    console.error("[warehouse/stats]", e);
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}
