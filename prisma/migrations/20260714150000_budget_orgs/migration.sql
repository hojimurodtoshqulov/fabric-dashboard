-- CreateEnum
CREATE TYPE "BudgetOrgStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PROSPECT', 'CONTRACT', 'REJECTED');

-- CreateTable
CREATE TABLE "budget_orgs" (
    "id"            TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "phone"         TEXT NOT NULL,
    "phone2"        TEXT,
    "email"         TEXT,
    "address"       TEXT,
    "region"        TEXT,
    "province"      TEXT,
    "status"        "BudgetOrgStatus" NOT NULL DEFAULT 'PROSPECT',
    "inn"           TEXT,
    "notes"         TEXT,
    "contactPerson" TEXT,
    "position"      TEXT,
    "orgType"       TEXT,
    "createdById"   TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_orgs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "budget_orgs_createdById_fkey"
        FOREIGN KEY ("createdById") REFERENCES "users"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "budget_orgs_province_idx" ON "budget_orgs"("province");
CREATE INDEX "budget_orgs_status_idx"   ON "budget_orgs"("status");
