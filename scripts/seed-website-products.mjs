import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const db = new PrismaClient();

const PRODUCTS = [
  { id: 1, slug: "bint-steril-7x10", category: "BINT", nameUz: "Steril Bint 7m×10sm", nameRu: "Стерильный Бинт 7м×10см", descriptionUz: "Bug' bilan sterilizatsiya qilingan tibbiy dokali bint. 100% paxta, 7m uzunlik, 10sm eni.", descriptionRu: "Стерильный марлевый медицинский бинт, стерилизован паром. 100% хлопок, длина 7м, ширина 10см.", packaging: "1 dona / 1 шт", validity: "5 yil / 5 лет", composition: "100% paxta / 100% хлопок", inStock: true, packageQty: 400, price: 1800, unit: "dona", isFeatured: true },
  { id: 2, slug: "bint-steril-7x12", category: "BINT", nameUz: "Steril Bint 7m×12sm", nameRu: "Стерильный Бинт 7м×12см", descriptionUz: "Bug' bilan sterilizatsiya qilingan tibbiy dokali bint. 100% paxta, 7m uzunlik, 12sm eni.", descriptionRu: "Стерильный марлевый медицинский бинт, стерилизован паром. 100% хлопок, длина 7м, ширина 12см.", packaging: "1 dona / 1 шт", validity: "5 yil / 5 лет", composition: "100% paxta / 100% хлопок", inStock: true, packageQty: 400, price: 0, unit: "dona", isFeatured: false },
  { id: 3, slug: "bint-steril-7x14", category: "BINT", nameUz: "Steril Bint 7m×14sm", nameRu: "Стерильный Бинт 7м×14см", descriptionUz: "Bug' bilan sterilizatsiya qilingan keng tibbiy bint. 100% paxta, 7m uzunlik, 14sm eni.", descriptionRu: "Стерильный широкий медицинский бинт, стерилизован паром. 100% хлопок, длина 7м, ширина 14см.", packaging: "1 dona / 1 шт", validity: "5 yil / 5 лет", composition: "100% paxta / 100% хлопок", inStock: true, packageQty: 400, price: 2500, unit: "dona", isFeatured: false },
  { id: 4, slug: "bint-steril-5x10", category: "BINT", nameUz: "Steril Bint 5m×10sm", nameRu: "Стерильный Бинт 5м×10см", descriptionUz: "Bug' bilan sterilizatsiya qilingan tibbiy dokali bint. 100% paxta, 5m uzunlik, 10sm eni.", descriptionRu: "Стерильный марлевый медицинский бинт, стерилизован паром. 100% хлопок, длина 5м, ширина 10см.", packaging: "1 dona / 1 шт", validity: "5 yil / 5 лет", composition: "100% paxta / 100% хлопок", inStock: true, packageQty: 500, price: 1500, unit: "dona", isFeatured: false },
  { id: 5, slug: "bint-nosteril-7x10", category: "BINT", nameUz: "Nosteril Bint 7m×10sm", nameRu: "Нестерильный Бинт 7м×10см", descriptionUz: "Sterillanmagan tibbiy dokali bint. 100% paxta, 7m uzunlik, 10sm eni.", descriptionRu: "Нестерильный марлевый медицинский бинт. 100% хлопок, длина 7м, ширина 10см.", packaging: "1 dona / 1 шт", validity: "5 yil / 5 лет", composition: "100% paxta / 100% хлопок", inStock: true, packageQty: 400, price: 1600, unit: "dona", isFeatured: false },
  { id: 6, slug: "bint-nosteril-7x12", category: "BINT", nameUz: "Nosteril Bint 7m×12sm", nameRu: "Нестерильный Бинт 7м×12см", descriptionUz: "Sterillanmagan tibbiy dokali bint. 100% paxta, 7m uzunlik, 12sm eni.", descriptionRu: "Нестерильный марлевый медицинский бинт. 100% хлопок, длина 7м, ширина 12см.", packaging: "1 dona / 1 шт", validity: "5 yil / 5 лет", composition: "100% paxta / 100% хлопок", inStock: true, packageQty: 400, price: 1900, unit: "dona", isFeatured: false },
  { id: 7, slug: "bint-nosteril-7x14", category: "BINT", nameUz: "Nosteril Bint 7m×14sm", nameRu: "Нестерильный Бинт 7м×14см", descriptionUz: "Sterillanmagan keng tibbiy dokali bint. 100% paxta, 7m uzunlik, 14sm eni.", descriptionRu: "Нестерильный широкий марлевый медицинский бинт. 100% хлопок, длина 7м, ширина 14см.", packaging: "1 dona / 1 шт", validity: "5 yil / 5 лет", composition: "100% paxta / 100% хлопок", inStock: true, packageQty: 400, price: 2000, unit: "dona", isFeatured: true },
  { id: 8, slug: "bint-nosteril-5x10", category: "BINT", nameUz: "Nosteril Bint 5m×10sm", nameRu: "Нестерильный Бинт 5м×10см", descriptionUz: "Sterillanmagan tibbiy dokali bint. 100% paxta, 5m uzunlik, 10sm eni.", descriptionRu: "Нестерильный марлевый медицинский бинт. 100% хлопок, длина 5м, ширина 10см.", packaging: "1 dona / 1 шт", validity: "5 yil / 5 лет", composition: "100% paxta / 100% хлопок", inStock: true, packageQty: 500, price: 1300, unit: "dona", isFeatured: false },
  { id: 9, slug: "vata-steril-50g", category: "VATA", nameUz: "Steril Vata 50g", nameRu: "Стерильная Вата 50г", descriptionUz: "Gigroskopik gigiyenik paxta vata, bug' bilan sterilizatsiya qilingan. Tibbiy muolajalar uchun.", descriptionRu: "Гигроскопическая гигиеническая медицинская вата, стерилизована паром. Для медицинских процедур.", packaging: "50g / 50г", validity: "5 yil / 5 лет", composition: "100% paxta / 100% хлопок", inStock: true, packageQty: 300, price: 4000, unit: "dona", isFeatured: true },
  { id: 10, slug: "vata-steril-25g", category: "VATA", nameUz: "Steril Vata 25g", nameRu: "Стерильная Вата 25г", descriptionUz: "Gigroskopik gigiyenik paxta vata, bug' bilan sterilizatsiya qilingan. 25 gramm.", descriptionRu: "Гигроскопическая гигиеническая медицинская вата, стерилизована паром. 25 грамм.", packaging: "25g / 25г", validity: "5 yil / 5 лет", composition: "100% paxta / 100% хлопок", inStock: true, packageQty: 500, price: 2000, unit: "dona", isFeatured: false },
  { id: 11, slug: "vata-steril-100g", category: "VATA", nameUz: "Steril Vata 100g", nameRu: "Стерильная Вата 100г", descriptionUz: "Gigroskopik gigiyenik paxta vata, bug' bilan sterilizatsiya qilingan. 100 gramm.", descriptionRu: "Гигроскопическая гигиеническая медицинская вата, стерилизована паром. 100 грамм.", packaging: "100g / 100г", validity: "5 yil / 5 лет", composition: "100% paxta / 100% хлопок", inStock: true, packageQty: 155, price: 8000, unit: "dona", isFeatured: false },
  { id: 12, slug: "vata-nosteril-50g", category: "VATA", nameUz: "Nosteril Vata 50g", nameRu: "Нестерильная Вата 50г", descriptionUz: "Gigroskopik gigiyenik tibbiy paxta vata, sterillanmagan. 50 gramm.", descriptionRu: "Гигроскопическая гигиеническая медицинская вата нестерильная. 50 грамм.", packaging: "50g / 50г", validity: "5 yil / 5 лет", composition: "100% paxta / 100% хлопок", inStock: true, packageQty: 300, price: 3000, unit: "dona", isFeatured: false },
  { id: 13, slug: "vata-nosteril-100g", category: "VATA", nameUz: "Nosteril Vata 100g", nameRu: "Нестерильная Вата 100г", descriptionUz: "Gigroskopik gigiyenik tibbiy paxta vata, sterillanmagan. 100 gramm.", descriptionRu: "Гигроскопическая гигиеническая медицинская вата нестерильная. 100 грамм.", packaging: "100g / 100г", validity: "5 yil / 5 лет", composition: "100% paxta / 100% хлопок", inStock: true, packageQty: 155, price: 6000, unit: "dona", isFeatured: false },
  { id: 14, slug: "marla-doka-5m", category: "MARLA", nameUz: "Tibbiy Doka 5m (bo'lak)", nameRu: "Медицинская Марля ДОКА 5м (кусок)", descriptionUz: "Oqartirilgan tibbiy doka, bo'lak shaklida. 5 metr uzunlik. ISO 13485 sertifikatlangan.", descriptionRu: "Медицинская отбеленная марля в кусках. Длина 5 метров. Сертифицировано ISO 13485.", packaging: "5m / 5м", validity: "5 yil / 5 лет", composition: "100% paxta / 100% хлопок", inStock: true, packageQty: 85, price: 10000, unit: "dona", isFeatured: true },
  { id: 15, slug: "marla-doka-10m", category: "MARLA", nameUz: "Tibbiy Doka 10m (bo'lak)", nameRu: "Медицинская Марля ДОКА 10м (кусок)", descriptionUz: "Oqartirilgan tibbiy doka, bo'lak shaklida. 10 metr uzunlik. ISO 13485 sertifikatlangan.", descriptionRu: "Медицинская отбеленная марля в кусках. Длина 10 метров. Сертифицировано ISO 13485.", packaging: "10m / 10м", validity: "5 yil / 5 лет", composition: "100% paxta / 100% хлопок", inStock: true, packageQty: 50, price: 20000, unit: "dona", isFeatured: false },
  { id: 16, slug: "marla-sariq-0.68x1m", category: "MARLA", nameUz: "Tibbiy Marla 0.68×1m (sariq qadoq)", nameRu: "Медицинская Марля 0.68×1м (жёлтая упаковка)", descriptionUz: "Oqartirilgan tibbiy marla, bo'lak shaklida. O'lchami 0.68×1 metr.", descriptionRu: "Медицинская отбеленная марля в кусках. Размер 0.68×1 метр.", packaging: "0.68×1m / 0.68×1м", validity: "5 yil / 5 лет", composition: "100% paxta / 100% хлопок", inStock: true, packageQty: 400, price: 2000, unit: "dona", isFeatured: false },
  { id: 17, slug: "marla-kok-0.68x1m", category: "MARLA", nameUz: "Tibbiy Marla 0.68×1m (ko'k qadoq)", nameRu: "Медицинская Марля 0.68×1м (синяя упаковка)", descriptionUz: "Oqartirilgan tibbiy marla, bo'lak shaklida. O'lchami 0.68×1 metr.", descriptionRu: "Медицинская отбеленная марля в кусках. Размер 0.68×1 метр.", packaging: "0.68×1m / 0.68×1м", validity: "5 yil / 5 лет", composition: "100% paxta / 100% хлопок", inStock: true, packageQty: 400, price: 2000, unit: "dona", isFeatured: false },
  { id: 18, slug: "marla-yashil-0.68x1m", category: "MARLA", nameUz: "Tibbiy Marla 0.68×1m (yashil qadoq)", nameRu: "Медицинская Марля 0.68×1м (зелёная упаковка)", descriptionUz: "Oqartirilgan tibbiy marla, bo'lak shaklida. O'lchami 0.68×1 metr.", descriptionRu: "Медицинская отбеленная марля в кусках. Размер 0.68×1 метр.", packaging: "0.68×1m / 0.68×1м", validity: "5 yil / 5 лет", composition: "100% paxta / 100% хлопок", inStock: true, packageQty: 400, price: 2000, unit: "dona", isFeatured: false },
  { id: 19, slug: "marla-pushti-0.68x1m", category: "MARLA", nameUz: "Tibbiy Marla 0.68×1m (pushti qadoq)", nameRu: "Медицинская Марля 0.68×1м (розовая упаковка)", descriptionUz: "Oqartirilgan tibbiy marla, bo'lak shaklida. O'lchami 0.68×1 metr.", descriptionRu: "Медицинская отбеленная марля в кусках. Размер 0.68×1 метр.", packaging: "0.68×1m / 0.68×1м", validity: "5 yil / 5 лет", composition: "100% paxta / 100% хлопок", inStock: true, packageQty: 400, price: 2000, unit: "dona", isFeatured: false },
  { id: 20, slug: "salfetka-steril-16x14-n10", category: "SALFETKA", nameUz: "Steril Salfetka 16×14sm №10", nameRu: "Стерильные Салфетки 16×14см №10", descriptionUz: "Sterillangan tibbiy dokali salfetka. Ikki qavatli, 16×14sm, 10 dona paket. Bug'da sterilizatsiya.", descriptionRu: "Стерильные марлевые медицинские салфетки. Двухслойные, 16×14см, 10 штук в упаковке. Стерилизованы паром.", packaging: "10 dona / 10 шт", validity: "5 yil / 5 лет", composition: "100% paxta / 100% хлопок", inStock: true, packageQty: 500, price: 2500, unit: "dona", isFeatured: true },
  { id: 21, slug: "salfetka-steril-45x29-n5", category: "SALFETKA", nameUz: "Steril Salfetka 45×29sm №5", nameRu: "Стерильные Салфетки 45×29см №5", descriptionUz: "Sterillangan katta tibbiy dokali salfetka. Ikki qavatli, 45×29sm, 5 dona paket. Jarrohlik uchun.", descriptionRu: "Стерильные большие марлевые медицинские салфетки. Двухслойные, 45×29см, 5 штук. Для хирургии.", packaging: "5 dona / 5 шт", validity: "5 yil / 5 лет", composition: "100% paxta / 100% хлопок", inStock: true, packageQty: 300, price: 3800, unit: "dona", isFeatured: false },
];

async function main() {
  console.log(`Importing ${PRODUCTS.length} products...`);
  let created = 0, skipped = 0;

  for (const p of PRODUCTS) {
    try {
      // 1. Upsert Product (by SKU = slug)
      const existing = await db.product.findUnique({ where: { sku: p.slug } });
      let productId;

      if (existing) {
        productId = existing.id;
      } else {
        const newProduct = await db.product.create({
          data: {
            id:          randomUUID(),
            name:        p.nameUz,
            sku:         p.slug,
            price:       p.price,
            unit:        p.unit,
            description: p.descriptionUz,
            isActive:    true,
          },
        });
        productId = newProduct.id;
      }

      // 2. Upsert WebsiteProduct
      const wp = await db.websiteProduct.findUnique({ where: { productId } });

      if (wp) {
        // Update existing (overwrite with website data)
        await db.websiteProduct.update({
          where: { productId },
          data: {
            nameUz:        p.nameUz,
            nameRu:        p.nameRu,
            descriptionUz: p.descriptionUz,
            descriptionRu: p.descriptionRu,
            packaging:     p.packaging,
            validity:      p.validity,
            composition:   p.composition,
            inStock:       p.inStock,
            packageQty:    p.packageQty,
            category:      p.category,
            isFeatured:    p.isFeatured,
            isPublished:   true,
            websitePrice:  p.price > 0 ? p.price : null,
            updatedAt:     new Date(),
          },
        });
        skipped++;
        console.log(`  ~ updated: ${p.nameUz}`);
      } else {
        await db.websiteProduct.create({
          data: {
            id:            randomUUID(),
            productId,
            nameUz:        p.nameUz,
            nameRu:        p.nameRu,
            descriptionUz: p.descriptionUz,
            descriptionRu: p.descriptionRu,
            packaging:     p.packaging,
            validity:      p.validity,
            composition:   p.composition,
            inStock:       p.inStock,
            packageQty:    p.packageQty,
            category:      p.category,
            isFeatured:    p.isFeatured,
            isPublished:   true,
            websitePrice:  p.price > 0 ? p.price : null,
            order:         p.id,
            seoKeywords:   [],
          },
        });
        created++;
        console.log(`  + created: ${p.nameUz}`);
      }
    } catch (e) {
      console.error(`  ERROR [${p.slug}]:`, e.message);
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} updated.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
