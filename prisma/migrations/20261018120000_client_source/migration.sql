-- Client origin: ONEC = faol (from 1C), MANUAL/IMPORT = potensial, inbound channels = yangi
CREATE TYPE "ClientSource" AS ENUM ('ONEC', 'MANUAL', 'IMPORT', 'WEBSITE', 'INSTAGRAM', 'TELEGRAM', 'WALK_IN');
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'REJECTED');

ALTER TABLE "clients"
  ADD COLUMN "source" "ClientSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "onecLinkedAt" TIMESTAMP(3);
CREATE INDEX "clients_source_idx" ON "clients"("source");

ALTER TABLE "onec_syncs"
  ADD COLUMN "debtsClosed" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "runId" TEXT;

CREATE TABLE "client_match_candidates" (
  "id"                TEXT NOT NULL,
  "onecClientId"      TEXT NOT NULL,
  "potentialClientId" TEXT NOT NULL,
  "score"             DOUBLE PRECISION NOT NULL,
  "reason"            TEXT NOT NULL,
  "status"            "MatchStatus" NOT NULL DEFAULT 'PENDING',
  "resolvedById"      TEXT,
  "resolvedAt"        TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_match_candidates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "client_match_candidates_onecClientId_potentialClientId_key"
  ON "client_match_candidates"("onecClientId", "potentialClientId");
CREATE INDEX "client_match_candidates_status_idx" ON "client_match_candidates"("status");
ALTER TABLE "client_match_candidates"
  ADD CONSTRAINT "client_match_candidates_onecClientId_fkey"
    FOREIGN KEY ("onecClientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "client_match_candidates_potentialClientId_fkey"
    FOREIGN KEY ("potentialClientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "client_merges" (
  "id"              TEXT NOT NULL,
  "onecClientId"    TEXT NOT NULL,
  "removedClientId" TEXT NOT NULL,
  "snapshot"        JSONB NOT NULL,
  "auto"            BOOLEAN NOT NULL DEFAULT false,
  "mergedById"      TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "client_merges_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "client_merges_onecClientId_idx" ON "client_merges"("onecClientId");

-- ── Backfill ────────────────────────────────────────────────────────────────

-- 1. Clients that 1C knows about: linked 1C invoices/debts, or the placeholder
--    phone the 1C sync generates for clients without a phone.
UPDATE "clients" c SET "source" = 'ONEC', "onecLinkedAt" = NOW()
WHERE c."phone" LIKE '+998000%'
   OR EXISTS (SELECT 1 FROM "invoices" i WHERE i."clientId" = c."id" AND i."source" = '1c')
   OR EXISTS (SELECT 1 FROM "debts" d WHERE d."clientId" = c."id" AND d."syncSource" = '1c');

-- 2. Converted inbound leads keep their channel.
UPDATE "clients" c SET "source" = l."source"::text::"ClientSource"
FROM (
  SELECT DISTINCT ON ("clientId") "clientId", "source" FROM "leads"
  WHERE "clientId" IS NOT NULL ORDER BY "clientId", "createdAt"
) l
WHERE l."clientId" = c."id" AND c."source" <> 'ONEC';

-- 3. Everything else was uploaded from Excel or typed in by hand → potensial.
UPDATE "clients" SET "source" = 'IMPORT' WHERE "source" = 'MANUAL';

-- 4. 1C clients are active buyers; debtors are those with an open 1C balance.
UPDATE "clients" c SET "status" = CASE
    WHEN EXISTS (
      SELECT 1 FROM "debts" d
      WHERE d."clientId" = c."id" AND d."syncSource" = '1c'
        AND d."status" IN ('PENDING', 'PARTIAL', 'OVERDUE') AND d."amount" > 0
    ) THEN 'DEBTOR'::"ClientStatus"
    ELSE 'ACTIVE'::"ClientStatus"
  END
WHERE c."source" = 'ONEC' AND c."status" IN ('ACTIVE', 'DEBTOR', 'PROSPECT', 'INACTIVE');

-- 5. Non-1C clients are never "active": imported ones defaulted to ACTIVE by mistake.
UPDATE "clients" c SET "status" = 'PROSPECT'
WHERE c."source" <> 'ONEC'
  AND (c."status" = 'ACTIVE'
    OR (c."status" = 'DEBTOR' AND NOT EXISTS (
      SELECT 1 FROM "debts" d
      WHERE d."clientId" = c."id" AND d."status" IN ('PENDING', 'PARTIAL', 'OVERDUE')
    )));
