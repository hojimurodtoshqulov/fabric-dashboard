-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('TELEGRAM', 'WEBSITE', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'CLOSED', 'CONVERTED');

-- CreateTable
CREATE TABLE "leads" (
    "id"           TEXT NOT NULL,
    "source"       "LeadSource" NOT NULL,
    "name"         TEXT,
    "phone"        TEXT,
    "province"     TEXT,
    "message"      TEXT NOT NULL,
    "status"       "LeadStatus" NOT NULL DEFAULT 'NEW',
    "notes"        TEXT,
    "metadata"     JSONB,
    "clientId"     TEXT,
    "assignedToId" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_source_idx"   ON "leads"("source");
CREATE INDEX "leads_status_idx"   ON "leads"("status");
CREATE INDEX "leads_province_idx" ON "leads"("province");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
