import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

const VALID_CATS = ["BINT", "VATA", "MARLA", "SALFETKA"] as const;
type WCat = typeof VALID_CATS[number];

export async function GET() {
  try {
    await requireAuth();

    const items = await db.websiteProduct.findMany({
      include: {
        product: {
          select: { name: true, description: true, price: true, unit: true, images: true, sku: true },
        },
      },
      orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ success: true, items });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * Creates a Product + WebsiteProduct in one step.
 * Body: { nameUz, nameRu, sku, price, unit, category?,
 *         descriptionUz?, descriptionRu?, packaging?, validity?,
 *         composition?, packageQty?, websitePrice? }
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();

    const {
      nameUz, nameRu, sku, price, unit,
      descriptionUz, descriptionRu,
      packaging, validity, composition,
      packageQty, websitePrice,
    } = body;
    const category: WCat | undefined = VALID_CATS.includes(body.category) ? body.category : undefined;

    if (!nameUz || !sku || price == null) {
      return NextResponse.json({ error: "nameUz, sku, price majburiy" }, { status: 400 });
    }

    const productId = randomUUID();
    const wpId      = randomUUID();

    // Upsert Product by sku
    const existing = await db.product.findUnique({ where: { sku }, select: { id: true } });
    const resolvedProductId = existing?.id ?? productId;

    if (!existing) {
      await db.product.create({
        data: {
          id:          productId,
          name:        nameUz,
          sku,
          price:       price,
          unit:        unit ?? "dona",
          description: descriptionUz ?? null,
          isActive:    true,
        },
      });
    }

    const item = await db.websiteProduct.upsert({
      where:  { productId: resolvedProductId },
      create: {
        id:           wpId,
        productId:    resolvedProductId,
        isPublished:  false,
        isFeatured:   false,
        inStock:      true,
        nameUz:       nameUz        ?? null,
        nameRu:       nameRu        ?? null,
        descriptionUz: descriptionUz ?? null,
        descriptionRu: descriptionRu ?? null,
        packaging:    packaging  ?? null,
        validity:     validity   ?? null,
        composition:  composition ?? null,
        packageQty:   packageQty  ? Number(packageQty)  : null,
        websitePrice: websitePrice ? Number(websitePrice) : null,
        category:     category ?? null,
      },
      update: {
        nameUz:       nameUz        ?? undefined,
        nameRu:       nameRu        ?? undefined,
        descriptionUz: descriptionUz ?? undefined,
        descriptionRu: descriptionRu ?? undefined,
        packaging:    packaging  ?? undefined,
        validity:     validity   ?? undefined,
        composition:  composition ?? undefined,
        packageQty:   packageQty  ? Number(packageQty)  : undefined,
        websitePrice: websitePrice ? Number(websitePrice) : undefined,
        category:     category ?? undefined,
        updatedAt:    new Date(),
      },
      include: {
        product: { select: { name: true, sku: true, price: true, unit: true, images: true } },
      },
    });

    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (e: any) {
    console.error("[website/products POST]", e);
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}
