-- 1C change feed and the agent version of each sync.

-- CreateEnum
CREATE TYPE "OneCChangeKind" AS ENUM ('SALE_NEW', 'SALE_CHANGED', 'DEBT_NEW', 'DEBT_CHANGED', 'DEBT_CLOSED', 'CLIENT_NEW', 'CASH_NEW', 'CASH_CHANGED', 'CASH_REMOVED');

-- AlterTable
ALTER TABLE "onec_syncs" ADD COLUMN "agentVersion" TEXT;

-- CreateTable
CREATE TABLE "onec_changes" (
    "id" TEXT NOT NULL,
    "kind" "OneCChangeKind" NOT NULL,
    "title" TEXT NOT NULL,
    "ref" TEXT,
    "detail" TEXT,
    "amount" DECIMAL(16,2),
    "previousAmount" DECIMAL(16,2),
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onec_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "onec_changes_createdAt_idx" ON "onec_changes"("createdAt");
