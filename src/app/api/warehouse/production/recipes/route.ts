import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET() {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const recipes = await db.$queryRaw<any[]>`
      SELECT
        pr.id, pr.name, pr.description, pr."isActive",
        pr."outputItemId", pr."outputQty"::float AS "outputQty",
        pr."createdAt", pr."updatedAt",
        oi.name AS out_name, oi.unit AS out_unit,
        oi."currentStock"::float AS out_stock,
        (SELECT COUNT(*) FROM "production_logs" pl WHERE pl."recipeId" = pr.id)::int AS log_count
      FROM "production_recipes" pr
      JOIN "warehouse_items" oi ON oi.id = pr."outputItemId"
      ORDER BY pr.name ASC
    `;

    const ids = recipes.map((r: any) => r.id);
    let ingredients: any[] = [];
    if (ids.length > 0) {
      ingredients = await db.$queryRaw<any[]>`
        SELECT
          pi.id, pi."recipeId", pi."itemId", pi.quantity::float AS quantity,
          wi.name AS item_name, wi.unit AS item_unit,
          wi."currentStock"::float AS item_stock
        FROM "production_ingredients" pi
        JOIN "warehouse_items" wi ON wi.id = pi."itemId"
        WHERE pi."recipeId" = ANY(${ids}::text[])
      `;
    }

    const ingByRecipe: Record<string, any[]> = {};
    for (const ing of ingredients) {
      if (!ingByRecipe[ing.recipeId]) ingByRecipe[ing.recipeId] = [];
      ingByRecipe[ing.recipeId].push({
        id: ing.id, recipeId: ing.recipeId, itemId: ing.itemId, quantity: ing.quantity,
        item: { id: ing.itemId, name: ing.item_name, unit: ing.item_unit, currentStock: ing.item_stock },
      });
    }

    const formatted = recipes.map((r: any) => ({
      id: r.id, name: r.name, description: r.description, isActive: r.isActive,
      outputItemId: r.outputItemId, outputQty: r.outputQty,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
      outputItem: { id: r.outputItemId, name: r.out_name, unit: r.out_unit, currentStock: r.out_stock },
      ingredients: ingByRecipe[r.id] ?? [],
      _count: { logs: r.log_count },
    }));

    return NextResponse.json({ success: true, data: { recipes: formatted } });
  } catch (e: any) {
    console.error("[production/recipes GET]", e);
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const body = await req.json();
    const { name, outputItemId, outputQty, description, ingredients } = body;

    if (!name || !outputItemId || !outputQty || !ingredients?.length) {
      return NextResponse.json({ error: "name, outputItemId, outputQty, ingredients majburiy" }, { status: 400 });
    }

    const recipeId = randomUUID();

    await db.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "production_recipes" (id, name, "outputItemId", "outputQty", description, "isActive", "createdAt", "updatedAt")
        VALUES (${recipeId}, ${name}, ${outputItemId}, ${parseFloat(outputQty)}, ${description || null}, true, NOW(), NOW())
      `;
      for (const ing of ingredients) {
        await tx.$executeRaw`
          INSERT INTO "production_ingredients" (id, "recipeId", "itemId", quantity)
          VALUES (${randomUUID()}, ${recipeId}, ${ing.itemId}, ${parseFloat(ing.quantity)})
        `;
      }
    });

    return NextResponse.json({ success: true, data: { id: recipeId } }, { status: 201 });
  } catch (e: any) {
    console.error("[production/recipes POST]", e);
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });

  try {
    await db.$executeRaw`DELETE FROM "production_recipes" WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}
