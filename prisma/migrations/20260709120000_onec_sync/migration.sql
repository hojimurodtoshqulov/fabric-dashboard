-- AddColumn: INN/PINFL to clients for 1C counterpart matching
ALTER TABLE "clients" ADD COLUMN "inn" TEXT;

-- CreateIndex: clients.inn for fast lookups
CREATE INDEX "clients_inn_idx" ON "clients"("inn");

-- AddColumn: debt aging buckets (from 1C "Задолженность покупателей" report)
ALTER TABLE "debts" ADD COLUMN "days0to30"   DECIMAL(14,2);
ALTER TABLE "debts" ADD COLUMN "days31to60"  DECIMAL(14,2);
ALTER TABLE "debts" ADD COLUMN "days61to90"  DECIMAL(14,2);
ALTER TABLE "debts" ADD COLUMN "days91to100" DECIMAL(14,2);
ALTER TABLE "debts" ADD COLUMN "daysOver100" DECIMAL(14,2);
ALTER TABLE "debts" ADD COLUMN "syncSource"  TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "debts" ADD COLUMN "lastSyncAt"  TIMESTAMP(3);

-- CreateTable: 1C sync log
CREATE TABLE "onec_syncs" (
    "id"             TEXT         NOT NULL,
    "startedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt"     TIMESTAMP(3),
    "status"         TEXT         NOT NULL DEFAULT 'RUNNING',
    "salesCount"     INTEGER      NOT NULL DEFAULT 0,
    "debtsCount"     INTEGER      NOT NULL DEFAULT 0,
    "clientsCreated" INTEGER      NOT NULL DEFAULT 0,
    "clientsUpdated" INTEGER      NOT NULL DEFAULT 0,
    "error"          TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "onec_syncs_pkey" PRIMARY KEY ("id")
);
