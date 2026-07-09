import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  let user: any;
  try { user = await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const body = await req.json();
    const { recipeId, batches, note } = body;

    if (!recipeId || !batches || parseFloat(batches) <= 0) {
      return NextResponse.json({ error: "recipeId va batches majburiy" }, { status: 400 });
    }

    const batchCount = parseFloat(batches);

    // Load recipe
    const [recipe] = await db.$queryRaw<any[]>`
      SELECT pr.id, pr.name, pr."outputItemId", pr."outputQty"::float AS "outputQty",
             oi.name AS out_name, oi.unit AS out_unit,
             oi."costPrice"::float AS out_cost
      FROM "production_recipes" pr
      JOIN "warehouse_items" oi ON oi.id = pr."outputItemId"
      WHERE pr.id = ${recipeId}
    `;
    if (!recipe) return NextResponse.json({ error: "Formula topilmadi" }, { status: 404 });

    // Load ingredients + check stock
    const ingredients = await db.$queryRaw<any[]>`
      SELECT pi."itemId", pi.quantity::float AS quantity,
             wi.name, wi.unit,
             wi."currentStock"::float AS "currentStock",
             wi."costPrice"::float    AS "costPrice"
      FROM "production_ingredients" pi
      JOIN "warehouse_items" wi ON wi.id = pi."itemId"
      WHERE pi."recipeId" = ${recipeId}
    `;

    for (const ing of ingredients) {
      const needed = ing.quantity * batchCount;
      if (ing.currentStock < needed) {
        return NextResponse.json({
          error: `${ing.name} yetarli emas. Kerak: ${needed.toFixed(3)} ${ing.unit}, Mavjud: ${ing.currentStock} ${ing.unit}`,
        }, { status: 400 });
      }
    }

    const outputQty = recipe.outputQty * batchCount;
    const logId     = randomUUID();

    await db.$transaction(async (tx) => {
      // Create production log
      await tx.$executeRaw`
        INSERT INTO "production_logs" (id, "recipeId", batches, "outputQty", note, "producedById", "producedAt")
        VALUES (${logId}, ${recipeId}, ${batchCount}, ${outputQty}, ${note || null}, ${user.id}, NOW())
      `;

      // Consume each ingredient
      for (const ing of ingredients) {
        const qty  = ing.quantity * batchCount;
        const movId = randomUUID();
        await tx.$executeRaw`
          INSERT INTO "stock_movements"
            (id, type, "itemId", quantity, "unitPrice", "totalAmount",
             "productionLogId", "createdById", note, "createdAt")
          VALUES (
            ${movId}, 'PRODUCTION_USE'::"MovementType", ${ing.itemId},
            ${qty}, ${ing.costPrice}, ${qty * ing.costPrice},
            ${logId}, ${user.id},
            ${`Ishlab chiqarish: ${recipe.name} × ${batchCount}`}, NOW()
          )
        `;
        await tx.$executeRaw`
          UPDATE "warehouse_items"
          SET "currentStock" = "currentStock" - ${qty}, "updatedAt" = NOW()
          WHERE id = ${ing.itemId}
        `;
      }

      // Add output
      const outMovId = randomUUID();
      await tx.$executeRaw`
        INSERT INTO "stock_movements"
          (id, type, "itemId", quantity, "unitPrice", "totalAmount",
           "productionLogId", "createdById", note, "createdAt")
        VALUES (
          ${outMovId}, 'PRODUCTION_OUTPUT'::"MovementType", ${recipe.outputItemId},
          ${outputQty}, ${recipe.out_cost}, ${outputQty * recipe.out_cost},
          ${logId}, ${user.id},
          ${`Ishlab chiqarish natijasi: ${recipe.name} × ${batchCount}`}, NOW()
        )
      `;
      await tx.$executeRaw`
        UPDATE "warehouse_items"
        SET "currentStock" = "currentStock" + ${outputQty}, "updatedAt" = NOW()
        WHERE id = ${recipe.outputItemId}
      `;
    });

    return NextResponse.json({ success: true, data: { logId, outputQty } }, { status: 201 });
  } catch (e: any) {
    console.error("[production/run]", e);
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}
