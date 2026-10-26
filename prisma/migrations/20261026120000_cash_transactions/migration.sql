-- Cash and bank movements mirrored from 1C.

-- CreateEnum
CREATE TYPE "CashDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "CashChannel" AS ENUM ('CASH', 'BANK');

-- CreateEnum
CREATE TYPE "CashCategory" AS ENUM ('CUSTOMER', 'SUPPLIER', 'PAYROLL', 'TAX', 'EXPENSE', 'OTHER');

-- AlterTable
ALTER TABLE "onec_syncs" ADD COLUMN "cashFlowsCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "cash_transactions" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "direction" "CashDirection" NOT NULL,
    "channel" "CashChannel" NOT NULL,
    "category" "CashCategory" NOT NULL,
    "amount" DECIMAL(16,2) NOT NULL,
    "counterparty" TEXT,
    "counterpartyInn" TEXT,
    "clientId" TEXT,
    "debitAccount" TEXT NOT NULL,
    "creditAccount" TEXT NOT NULL,
    "docRef" TEXT NOT NULL,
    "purpose" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_transactions_externalId_key" ON "cash_transactions"("externalId");

-- CreateIndex
CREATE INDEX "cash_transactions_date_idx" ON "cash_transactions"("date");

-- CreateIndex
CREATE INDEX "cash_transactions_direction_date_idx" ON "cash_transactions"("direction", "date");

-- CreateIndex
CREATE INDEX "cash_transactions_clientId_idx" ON "cash_transactions"("clientId");

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
