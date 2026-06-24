import axios from "axios";
import { config } from "@/config";
import { db } from "@/lib/db";

const websiteApi = axios.create({
  baseURL: config.website.apiUrl,
  headers: { "X-API-Key": config.website.apiKey },
  timeout: 10000,
});

export class WebsiteService {
  // ─── Products ──────────────────────────────────────────────────────────────

  async syncProduct(productId: string) {
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { websiteProduct: true, category: true },
    });
    if (!product || !product.websiteProduct?.isPublished) return;

    await websiteApi.put(`/products/${product.sku}`, {
      name: product.name,
      description: product.websiteProduct.seoDesc || product.description,
      price: product.websiteProduct.websitePrice || product.price,
      stock: product.stock,
      images: product.images,
      category: product.category?.slug,
      is_featured: product.websiteProduct.isFeatured,
      seo: {
        title: product.websiteProduct.seoTitle,
        description: product.websiteProduct.seoDesc,
        keywords: product.websiteProduct.seoKeywords,
      },
    });

    await db.websiteProduct.update({
      where: { productId },
      data: { syncedAt: new Date() },
    });
  }

  async syncAllProducts() {
    const published = await db.websiteProduct.findMany({
      where: { isPublished: true },
      include: { product: true },
    });

    const results = [];
    for (const wp of published) {
      try {
        await this.syncProduct(wp.productId);
        results.push({ productId: wp.productId, success: true });
      } catch (error) {
        results.push({
          productId: wp.productId,
          success: false,
          error: error instanceof Error ? error.message : "Sync failed",
        });
      }
    }

    return results;
  }

  // ─── Banners ──────────────────────────────────────────────────────────────

  async syncBanners() {
    const banners = await db.websiteBanner.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });

    await websiteApi.put("/banners", {
      banners: banners.map((b) => ({
        id: b.id,
        title: b.title,
        subtitle: b.subtitle,
        image_url: b.imageUrl,
        link_url: b.linkUrl,
        order: b.order,
      })),
    });

    return banners.length;
  }

  // ─── Discounts ────────────────────────────────────────────────────────────

  async syncDiscounts() {
    const discounts = await db.websiteDiscount.findMany({
      where: {
        isActive: true,
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
    });

    await websiteApi.put("/discounts", {
      discounts: discounts.map((d) => ({
        id: d.id,
        code: d.code,
        type: d.type,
        value: d.value,
        min_order: d.minOrder,
      })),
    });

    return discounts.length;
  }

  // ─── Bonuses ──────────────────────────────────────────────────────────────

  async syncBonuses() {
    const bonuses = await db.websiteBonus.findMany({
      where: {
        isActive: true,
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
    });

    await websiteApi.put("/bonuses", { bonuses });
    return bonuses.length;
  }

  // ─── Dashboard management ─────────────────────────────────────────────────

  async updateProductWebsiteSettings(
    productId: string,
    data: {
      isPublished?: boolean;
      isFeatured?: boolean;
      seoTitle?: string;
      seoDesc?: string;
      seoKeywords?: string[];
      websitePrice?: number;
    }
  ) {
    const result = await db.websiteProduct.upsert({
      where: { productId },
      create: { productId, ...data },
      update: data,
    });

    if (data.isPublished) {
      await this.syncProduct(productId).catch(() => {});
    }

    return result;
  }
}

export const websiteService = new WebsiteService();
