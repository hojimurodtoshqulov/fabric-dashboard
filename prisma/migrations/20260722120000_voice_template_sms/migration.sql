ALTER TABLE "voice_templates"
  ADD COLUMN "sendSmsAfterCall" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "smsText" TEXT;
