-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "province" TEXT;

-- CreateIndex
CREATE INDEX "clients_province_idx" ON "clients"("province");
