-- CreateEnum
CREATE TYPE "VoiceTemplateType" AS ENUM ('DEBT_DUE_SOON', 'DEBT_OVERDUE', 'PROSPECT_INTRO', 'LOST_CLIENT_REACTIVATION', 'NEW_CAMPAIGN', 'BONUS_OFFER', 'PAYMENT_CONFIRMATION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CallMode" AS ENUM ('TEMPLATE', 'AI_DYNAMIC', 'AI_CONVERSATION');

-- CreateEnum
CREATE TYPE "CallResultType" AS ENUM ('ANSWERED', 'NO_ANSWER', 'BUSY', 'PAYMENT_CONFIRMED', 'PROMISE_TO_PAY', 'INTERESTED', 'NOT_INTERESTED', 'CALLBACK_REQUESTED');

-- CreateTable voice_templates
CREATE TABLE "voice_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VoiceTemplateType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "audioFileUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dtmfConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "voice_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable call_responses
CREATE TABLE "call_responses" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "responseKey" TEXT NOT NULL,
    "responseLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "call_responses_pkey" PRIMARY KEY ("id")
);

-- AlterTable calls — add new columns (backward compatible, all nullable or with defaults)
ALTER TABLE "calls" ADD COLUMN "callMode" "CallMode" NOT NULL DEFAULT 'AI_DYNAMIC';
ALTER TABLE "calls" ADD COLUMN "callResult" "CallResultType";
ALTER TABLE "calls" ADD COLUMN "voiceTemplateId" TEXT;

-- CreateIndex
CREATE INDEX "call_responses_callId_idx" ON "call_responses"("callId");
CREATE INDEX "call_responses_clientId_idx" ON "call_responses"("clientId");
CREATE INDEX "calls_voiceTemplateId_idx" ON "calls"("voiceTemplateId");

-- AddForeignKey
ALTER TABLE "call_responses" ADD CONSTRAINT "call_responses_callId_fkey" FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "call_responses" ADD CONSTRAINT "call_responses_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "calls" ADD CONSTRAINT "calls_voiceTemplateId_fkey" FOREIGN KEY ("voiceTemplateId") REFERENCES "voice_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
