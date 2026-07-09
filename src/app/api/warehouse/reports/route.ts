import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const period  = searchParams.get("period") ?? "month";
  const fromStr = searchParams.get("from");
  const toStr   = searchParams.get("to");

  const now = new Date();
  let from: Date;
  let to:   Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (period) {
    case "today": from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
    case "week":  from = new Date(now); from.setDate(from.getDate() - 6); from.setHours(0,0,0,0); break;
    case "year":  from = new Date(now.getFullYear(), 0, 1); to = new Date(now.getFullYear(), 11, 31, 23, 59, 59); break;
    default:      from = fromStr ? new Date(fromStr) : new Date(now.getFullYear(), now.getMonth(), 1);
                  if (toStr) to = new Date(toStr + "T23:59:59"); break;
  }

  try {
    const [inAgg, outAgg, dailyRows, topItemsRows, supRows] = await Promise.all([
      db.$queryRaw<any[]>`
        SELECT SUM("totalAmount"::float) AS amount, COUNT(*)::int AS cnt
        FROM "stock_movements"
        WHERE type = 'IN'::"MovementType" AND "createdAt" BETWEEN ${from} AND ${to}
      `,
      db.$queryRaw<any[]>`
        SELECT SUM("totalAmount"::float) AS amount, COUNT(*)::int AS cnt
        FROM "stock_movements"
        WHERE type IN ('OUT'::"MovementType", 'PRODUCTION_USE'::"MovementType")
          AND "createdAt" BETWEEN ${from} AND ${to}
      `,
      db.$queryRaw<any[]>`
        SELECT
          DATE("createdAt")::text AS date,
          type::text              AS type,
          SUM("totalAmount"::float) AS total_amount,
          SUM(quantity::float)      AS total_qty
        FROM "stock_movements"
        WHERE "createdAt" BETWEEN ${from} AND ${to}
          AND type IN ('IN'::"MovementType", 'OUT'::"MovementType", 'PRODUCTION_OUTPUT'::"MovementType")
        GROUP BY DATE("createdAt"), type
        ORDER BY DATE("createdAt") ASC
      `,
      db.$queryRaw<any[]>`
        SELECT sm."itemId", sm.type::text AS type,
               SUM("totalAmount"::float) AS amount,
               SUM(quantity::float)      AS qty,
               COUNT(*)::int             AS cnt,
               wi.name AS item_name, wi.unit AS item_unit
        FROM "stock_movements" sm
        JOIN "warehouse_items" wi ON wi.id = sm."itemId"
        WHERE sm."createdAt" BETWEEN ${from} AND ${to}
        GROUP BY sm."itemId", sm.type, wi.name, wi.unit
        ORDER BY SUM("totalAmount"::float) DESC
        LIMIT 20
      `,
      db.$queryRaw<any[]>`
        SELECT sm."supplierId",
               SUM("totalAmount"::float) AS amount,
               COUNT(*)::int AS cnt,
               s.name AS sup_name
        FROM "stock_movements" sm
        JOIN "suppliers" s ON s.id = sm."supplierId"
        WHERE sm.type = 'IN'::"MovementType"
          AND sm."createdAt" BETWEEN ${from} AND ${to}
        GROUP BY sm."supplierId", s.name
        ORDER BY SUM("totalAmount"::float) DESC
        LIMIT 5
      `,
    ]);

    // Build daily chart data
    const dayMap = new Map<string, { date: string; in: number; out: number; production: number }>();
    for (const row of dailyRows) {
      if (!dayMap.has(row.date)) dayMap.set(row.date, { date: row.date, in: 0, out: 0, production: 0 });
      const d = dayMap.get(row.date)!;
      if (row.type === "IN")               d.in         += row.total_amount;
      else if (row.type === "OUT")         d.out        += row.total_amount;
      else if (row.type === "PRODUCTION_OUTPUT") d.production += row.total_qty;
    }
    const chartData = Array.from(dayMap.values());

    return NextResponse.json({
      success: true,
      data: {
        period, from: from.toISOString(), to: to.toISOString(),
        summary: {
          in:  { amount: parseFloat(inAgg[0]?.amount ?? 0),  count: inAgg[0]?.cnt  ?? 0 },
          out: { amount: parseFloat(outAgg[0]?.amount ?? 0), count: outAgg[0]?.cnt ?? 0 },
        },
        chartData,
        topItems: topItemsRows.map(r => ({
          itemId: r.itemId, type: r.type, amount: r.amount, qty: r.qty,
          item: { name: r.item_name, unit: r.item_unit },
        })),
        topSuppliers: supRows.map(r => ({
          supplier: { name: r.sup_name },
          amount: r.amount,
          count:  r.cnt,
        })),
      },
    });
  } catch (e: any) {
    console.error("[warehouse/reports]", e);
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}
