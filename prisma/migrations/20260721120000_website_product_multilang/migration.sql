-- CreateEnum
CREATE TYPE "WebsiteCategory" AS ENUM ('BINT', 'VATA', 'MARLA', 'SALFETKA');

-- AlterTable: add new columns to website_products
ALTER TABLE "website_products"
  ADD COLUMN "nameUz"        TEXT,
  ADD COLUMN "nameRu"        TEXT,
  ADD COLUMN "descriptionUz" TEXT,
  ADD COLUMN "descriptionRu" TEXT,
  ADD COLUMN "packaging"     TEXT,
  ADD COLUMN "validity"      TEXT,
  ADD COLUMN "composition"   TEXT,
  ADD COLUMN "inStock"       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "packageQty"    INTEGER,
  ADD COLUMN "category"      "WebsiteCategory";

-- Migrate existing seoTitle → nameUz, seoDesc → descriptionUz
UPDATE "website_products"
SET
  "nameUz"        = "seoTitle",
  "descriptionUz" = "seoDesc"
WHERE "seoTitle" IS NOT NULL OR "seoDesc" IS NOT NULL;
