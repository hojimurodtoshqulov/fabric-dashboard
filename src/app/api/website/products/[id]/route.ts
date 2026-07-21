import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";

const VALID_CATS = ["BINT", "VATA", "MARLA", "SALFETKA"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = { updatedAt: new Date() };

    if (typeof body.isPublished  === "boolean") data.isPublished  = body.isPublished;
    if (typeof body.isFeatured   === "boolean") data.isFeatured   = body.isFeatured;
    if (typeof body.inStock      === "boolean") data.inStock      = body.inStock;
    if (typeof body.order        === "number")  data.order        = body.order;

    if (body.nameUz        !== undefined) data.nameUz        = body.nameUz        || null;
    if (body.nameRu        !== undefined) data.nameRu        = body.nameRu        || null;
    if (body.descriptionUz !== undefined) data.descriptionUz = body.descriptionUz || null;
    if (body.descriptionRu !== undefined) data.descriptionRu = body.descriptionRu || null;
    if (body.packaging     !== undefined) data.packaging     = body.packaging     || null;
    if (body.validity      !== undefined) data.validity      = body.validity      || null;
    if (body.composition   !== undefined) data.composition   = body.composition   || null;
    if (body.websitePrice  !== undefined) data.websitePrice  = body.websitePrice ? Number(body.websitePrice) : null;
    if (body.packageQty    !== undefined) data.packageQty    = body.packageQty ? Number(body.packageQty) : null;

    if (body.category !== undefined) {
      data.category = VALID_CATS.includes(body.category) ? body.category : null;
    }

    const item = await db.websiteProduct.update({
      where: { id },
      data,
      include: {
        product: { select: { name: true, sku: true, price: true, unit: true, images: true } },
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (e: any) {
    console.error("[website/products PATCH]", e);
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    await db.websiteProduct.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
