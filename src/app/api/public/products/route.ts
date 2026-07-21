// Public endpoint — no auth, called by external website
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET() {
  try {
    const items = await db.websiteProduct.findMany({
      where: { isPublished: true },
      include: {
        product: {
          select: { name: true, description: true, price: true, unit: true, images: true, sku: true },
        },
      },
      orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { createdAt: "asc" }],
    });

    const products = items.map(wp => ({
      id:            wp.id,
      slug:          wp.product.sku ?? wp.id,
      category:      wp.category ? wp.category.toLowerCase() : null,

      nameUz:        wp.nameUz        ?? wp.seoTitle ?? wp.product.name,
      nameRu:        wp.nameRu        ?? wp.seoTitle ?? wp.product.name,
      descriptionUz: wp.descriptionUz ?? wp.seoDesc  ?? wp.product.description ?? "",
      descriptionRu: wp.descriptionRu ?? wp.seoDesc  ?? wp.product.description ?? "",

      packaging:     wp.packaging  ?? null,
      validity:      wp.validity   ?? null,
      composition:   wp.composition ?? null,

      inStock:       wp.inStock,
      packageQty:    wp.packageQty ?? null,
      price:         Number(wp.websitePrice ?? wp.product.price),
      unit:          wp.product.unit,
      images:        wp.product.images,
      isFeatured:    wp.isFeatured,
    }));

    return NextResponse.json({ products }, { headers: CORS });
  } catch (e) {
    console.error("[public/products]", e);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
