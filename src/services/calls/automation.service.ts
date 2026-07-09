import { db } from "@/lib/db";
import { scheduleTemplateCall } from "@/lib/queue";
import { voiceTemplateService } from "@/services/voice-templates/voiceTemplate.service";
import type { DtmfConfig } from "@/types";

interface AutomationResult {
  scheduled: number;
  skipped: number;
  errors: string[];
}

async function getSystemUserId(): Promise<string> {
  const directors = await db.$queryRaw<{ id: string }[]>`
    SELECT u.id FROM users u
    INNER JOIN roles r ON r.id = u."roleId"
    WHERE r.name = 'DIRECTOR'
    LIMIT 1
  `;
  if (!directors[0]) throw new Error("No director user found for automation");
  return directors[0].id;
}

async function hasRecentCall(clientId: string, hoursAgo = 24): Promise<boolean> {
  const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  const rows = await db.$queryRaw<{ cnt: bigint }[]>`
    SELECT COUNT(*)::bigint AS cnt FROM calls
    WHERE "clientId" = ${clientId}
      AND "createdAt" >= ${since}
      AND status != 'CANCELLED'
  `;
  return Number(rows[0]?.cnt ?? 0) > 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createCall(data: Record<string, any>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any).call.create({ data });
}

export const automationService = {
  async runDebtorAutomation(): Promise<AutomationResult> {
    const result: AutomationResult = { scheduled: 0, skipped: 0, errors: [] };
    const userId = await getSystemUserId();
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Debt due soon (within 3 days)
    const dueSoonDebts = await db.debt.findMany({
      where: {
        status: { in: ["PENDING", "PARTIAL"] },
        dueDate: { gte: now, lte: threeDaysFromNow },
      },
      include: { client: { select: { id: true, name: true, phone: true } } },
    });

    const dueSoonTemplate = await voiceTemplateService.getByType("DEBT_DUE_SOON");

    for (const debt of dueSoonDebts) {
      if (!debt.client.phone) { result.skipped++; continue; }
      if (await hasRecentCall(debt.clientId)) { result.skipped++; continue; }
      try {
        const call = await createCall({
          clientId: debt.clientId,
          initiatedById: userId,
          purpose: "DEBT_REMINDER",
          callMode: "TEMPLATE",
          voiceTemplateId: dueSoonTemplate?.id ?? null,
          phone: debt.client.phone,
          status: "PENDING",
          maxAttempts: 2,
        });
        await scheduleTemplateCall({
          callId: call.id,
          clientId: debt.clientId,
          clientName: debt.client.name,
          clientPhone: debt.client.phone,
          purpose: "DEBT_REMINDER",
          callMode: "TEMPLATE",
          voiceTemplateId: dueSoonTemplate?.id,
          audioFileUrl: dueSoonTemplate?.audioFileUrl ?? undefined,
          dtmfConfig: (dueSoonTemplate?.dtmfConfig as DtmfConfig) ?? null,
          context: { debtAmount: Number(debt.amount), dueDate: debt.dueDate.toISOString() },
          attempt: 1,
          maxAttempts: 2,
        });
        result.scheduled++;
      } catch (e) {
        result.errors.push(`debt_due_soon:${debt.id}: ${e instanceof Error ? e.message : e}`);
      }
    }

    // Overdue debts
    const overdueDebts = await db.debt.findMany({
      where: {
        status: { in: ["OVERDUE", "PARTIAL"] },
        dueDate: { lt: now },
      },
      include: { client: { select: { id: true, name: true, phone: true } } },
      take: 50,
    });

    const overdueTemplate = await voiceTemplateService.getByType("DEBT_OVERDUE");

    for (const debt of overdueDebts) {
      if (!debt.client.phone) { result.skipped++; continue; }
      if (await hasRecentCall(debt.clientId, 48)) { result.skipped++; continue; }
      try {
        const call = await createCall({
          clientId: debt.clientId,
          initiatedById: userId,
          purpose: "DEBT_REMINDER",
          callMode: "TEMPLATE",
          voiceTemplateId: overdueTemplate?.id ?? null,
          phone: debt.client.phone,
          status: "PENDING",
          maxAttempts: 3,
        });
        await scheduleTemplateCall({
          callId: call.id,
          clientId: debt.clientId,
          clientName: debt.client.name,
          clientPhone: debt.client.phone,
          purpose: "DEBT_REMINDER",
          callMode: "TEMPLATE",
          voiceTemplateId: overdueTemplate?.id,
          audioFileUrl: overdueTemplate?.audioFileUrl ?? undefined,
          dtmfConfig: (overdueTemplate?.dtmfConfig as DtmfConfig) ?? null,
          context: { debtAmount: Number(debt.amount), dueDate: debt.dueDate.toISOString() },
          attempt: 1,
          maxAttempts: 3,
        });
        result.scheduled++;
      } catch (e) {
        result.errors.push(`debt_overdue:${debt.id}: ${e instanceof Error ? e.message : e}`);
      }
    }

    return result;
  },

  async runProspectAutomation(): Promise<AutomationResult> {
    const result: AutomationResult = { scheduled: 0, skipped: 0, errors: [] };
    const userId = await getSystemUserId();
    const template = await voiceTemplateService.getByType("PROSPECT_INTRO");
    if (!template) return result;

    const prospects = await db.client.findMany({
      where: { status: "PROSPECT" },
      select: { id: true, name: true, phone: true },
      take: 20,
    });

    for (const client of prospects) {
      if (!client.phone) { result.skipped++; continue; }
      if (await hasRecentCall(client.id, 72)) { result.skipped++; continue; }
      try {
        const call = await createCall({
          clientId: client.id,
          initiatedById: userId,
          purpose: "OFFER",
          callMode: "TEMPLATE",
          voiceTemplateId: template.id,
          phone: client.phone,
          status: "PENDING",
          maxAttempts: 2,
        });
        await scheduleTemplateCall({
          callId: call.id,
          clientId: client.id,
          clientName: client.name,
          clientPhone: client.phone,
          purpose: "OFFER",
          callMode: "TEMPLATE",
          voiceTemplateId: template.id,
          audioFileUrl: template.audioFileUrl ?? undefined,
          dtmfConfig: (template.dtmfConfig as DtmfConfig) ?? null,
          context: {},
          attempt: 1,
          maxAttempts: 2,
        });
        result.scheduled++;
      } catch (e) {
        result.errors.push(`prospect:${client.id}: ${e instanceof Error ? e.message : e}`);
      }
    }

    return result;
  },

  async runLostClientAutomation(): Promise<AutomationResult> {
    const result: AutomationResult = { scheduled: 0, skipped: 0, errors: [] };
    const userId = await getSystemUserId();
    const template = await voiceTemplateService.getByType("LOST_CLIENT_REACTIVATION");
    if (!template) return result;

    const lostClients = await db.client.findMany({
      where: { status: "LOST" },
      select: { id: true, name: true, phone: true },
      take: 20,
    });

    for (const client of lostClients) {
      if (!client.phone) { result.skipped++; continue; }
      if (await hasRecentCall(client.id, 168)) { result.skipped++; continue; }
      try {
        const call = await createCall({
          clientId: client.id,
          initiatedById: userId,
          purpose: "REACTIVATION",
          callMode: "TEMPLATE",
          voiceTemplateId: template.id,
          phone: client.phone,
          status: "PENDING",
          maxAttempts: 2,
        });
        await scheduleTemplateCall({
          callId: call.id,
          clientId: client.id,
          clientName: client.name,
          clientPhone: client.phone,
          purpose: "REACTIVATION",
          callMode: "TEMPLATE",
          voiceTemplateId: template.id,
          audioFileUrl: template.audioFileUrl ?? undefined,
          dtmfConfig: (template.dtmfConfig as DtmfConfig) ?? null,
          context: {},
          attempt: 1,
          maxAttempts: 2,
        });
        result.scheduled++;
      } catch (e) {
        result.errors.push(`lost:${client.id}: ${e instanceof Error ? e.message : e}`);
      }
    }

    return result;
  },

  async runAllAutomations() {
    const [debtor, prospect, lost] = await Promise.all([
      this.runDebtorAutomation(),
      this.runProspectAutomation(),
      this.runLostClientAutomation(),
    ]);
    return { debtor, prospect, lost };
  },
};
