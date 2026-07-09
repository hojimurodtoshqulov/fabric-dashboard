-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('RAW_MATERIAL', 'FINISHED_PRODUCT', 'PACKAGING', 'CHEMICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('IN', 'OUT', 'PRODUCTION_USE', 'PRODUCTION_OUTPUT', 'ADJUSTMENT');

-- CreateTable: suppliers
CREATE TABLE "suppliers" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "company"   TEXT,
    "phone"     TEXT,
    "region"    TEXT,
    "inn"       TEXT,
    "notes"     TEXT,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: warehouse_items
CREATE TABLE "warehouse_items" (
    "id"           TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "sku"          TEXT,
    "unit"         TEXT NOT NULL DEFAULT 'kg',
    "category"     "ItemCategory" NOT NULL DEFAULT 'RAW_MATERIAL',
    "description"  TEXT,
    "costPrice"    DECIMAL(12,2) NOT NULL DEFAULT 0,
    "salePrice"    DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currentStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "minStock"     DECIMAL(12,3) NOT NULL DEFAULT 0,
    "supplierId"   TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "warehouse_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: stock_movements
CREATE TABLE "stock_movements" (
    "id"              TEXT NOT NULL,
    "type"            "MovementType" NOT NULL,
    "itemId"          TEXT NOT NULL,
    "quantity"        DECIMAL(12,3) NOT NULL,
    "unitPrice"       DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount"     DECIMAL(14,2) NOT NULL DEFAULT 0,
    "supplierId"      TEXT,
    "invoiceNo"       TEXT,
    "clientId"        TEXT,
    "productionLogId" TEXT,
    "note"            TEXT,
    "createdById"     TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable: production_recipes
CREATE TABLE "production_recipes" (
    "id"           TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "outputItemId" TEXT NOT NULL,
    "outputQty"    DECIMAL(12,3) NOT NULL,
    "description"  TEXT,
    "isActive"     BOOLEAN NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "production_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: production_ingredients
CREATE TABLE "production_ingredients" (
    "id"       TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "itemId"   TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    CONSTRAINT "production_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable: production_logs
CREATE TABLE "production_logs" (
    "id"          TEXT NOT NULL,
    "recipeId"    TEXT NOT NULL,
    "batches"     DECIMAL(8,3) NOT NULL,
    "outputQty"   DECIMAL(12,3) NOT NULL,
    "note"        TEXT,
    "producedById" TEXT,
    "producedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "production_logs_pkey" PRIMARY KEY ("id")
);

-- Unique Indexes
CREATE UNIQUE INDEX "warehouse_items_sku_key" ON "warehouse_items"("sku");

-- Regular Indexes
CREATE INDEX "warehouse_items_category_idx" ON "warehouse_items"("category");
CREATE INDEX "stock_movements_type_idx"      ON "stock_movements"("type");
CREATE INDEX "stock_movements_itemId_idx"    ON "stock_movements"("itemId");
CREATE INDEX "stock_movements_createdAt_idx" ON "stock_movements"("createdAt");
CREATE INDEX "stock_movements_supplierId_idx" ON "stock_movements"("supplierId");
CREATE INDEX "production_logs_recipeId_idx"  ON "production_logs"("recipeId");

-- Foreign Keys
ALTER TABLE "warehouse_items"
    ADD CONSTRAINT "warehouse_items_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_movements"
    ADD CONSTRAINT "stock_movements_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "warehouse_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_movements"
    ADD CONSTRAINT "stock_movements_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_movements"
    ADD CONSTRAINT "stock_movements_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_movements"
    ADD CONSTRAINT "stock_movements_productionLogId_fkey"
    FOREIGN KEY ("productionLogId") REFERENCES "production_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_movements"
    ADD CONSTRAINT "stock_movements_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "production_recipes"
    ADD CONSTRAINT "production_recipes_outputItemId_fkey"
    FOREIGN KEY ("outputItemId") REFERENCES "warehouse_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_ingredients"
    ADD CONSTRAINT "production_ingredients_recipeId_fkey"
    FOREIGN KEY ("recipeId") REFERENCES "production_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "production_ingredients"
    ADD CONSTRAINT "production_ingredients_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "warehouse_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_logs"
    ADD CONSTRAINT "production_logs_recipeId_fkey"
    FOREIGN KEY ("recipeId") REFERENCES "production_recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_logs"
    ADD CONSTRAINT "production_logs_producedById_fkey"
    FOREIGN KEY ("producedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
