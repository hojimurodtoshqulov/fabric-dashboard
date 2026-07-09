import { config } from "@/config";
import type { CallJobData, MessageJobData, TemplateCallJobData } from "@/types";

// Lazy-load BullMQ only when Redis is available
let _callsQueue: import("bullmq").Queue<CallJobData> | null = null;
let _messagesQueue: import("bullmq").Queue<MessageJobData> | null = null;
let _debtRemindersQueue: import("bullmq").Queue | null = null;

function getConnection() {
  try {
    const url = new URL(config.redis.url);
    return {
      host: url.hostname,
      port: Number(url.port) || 6379,
      password: config.redis.password || url.password || undefined,
      maxRetriesPerRequest: null as unknown as number,
    };
  } catch {
    return null;
  }
}

async function getQueue<T>(name: string): Promise<import("bullmq").Queue<T> | null> {
  const conn = getConnection();
  if (!conn) return null;
  try {
    const { Queue } = await import("bullmq");
    return new Queue<T>(name, { connection: conn });
  } catch {
    return null;
  }
}

export async function scheduleCall(data: CallJobData, delayMs = 0): Promise<void> {
  try {
    const { Queue } = await import("bullmq");
    const conn = getConnection();
    if (!conn) { console.log("[Queue] Redis unavailable, call skipped:", data.callId); return; }
    const q = new Queue<CallJobData>("ai-calls", { connection: conn });
    await q.add("initiate-call", data, { delay: delayMs, jobId: `call-${data.callId}` });
    await q.close();
  } catch (e) {
    console.warn("[Queue] scheduleCall failed:", e instanceof Error ? e.message : e);
  }
}

export async function scheduleMessage(data: MessageJobData, delayMs = 0): Promise<void> {
  try {
    const { Queue } = await import("bullmq");
    const conn = getConnection();
    if (!conn) { console.log("[Queue] Redis unavailable, message skipped"); return; }
    const q = new Queue<MessageJobData>("messages", { connection: conn });
    await q.add("send-message", data, { delay: delayMs });
    await q.close();
  } catch (e) {
    console.warn("[Queue] scheduleMessage failed:", e instanceof Error ? e.message : e);
  }
}

export async function scheduleDebtReminder(
  data: { debtId: string; clientId: string; type: string },
  delayMs = 0
): Promise<void> {
  try {
    const { Queue } = await import("bullmq");
    const conn = getConnection();
    if (!conn) { console.log("[Queue] Redis unavailable, reminder skipped"); return; }
    const q = new Queue("debt-reminders", { connection: conn });
    await q.add("send-debt-reminder", data, { delay: delayMs, jobId: `debt-${data.debtId}-${data.type}` });
    await q.close();
  } catch (e) {
    console.warn("[Queue] scheduleDebtReminder failed:", e instanceof Error ? e.message : e);
  }
}

export async function scheduleTemplateCall(data: TemplateCallJobData, delayMs = 0): Promise<void> {
  try {
    const { Queue } = await import("bullmq");
    const conn = getConnection();
    if (!conn) { console.log("[Queue] Redis unavailable, template call skipped:", data.callId); return; }
    const q = new Queue<TemplateCallJobData>("template-calls", { connection: conn });
    await q.add("template-call", data, { delay: delayMs, jobId: `tcall-${data.callId}` });
    await q.close();
  } catch (e) {
    console.warn("[Queue] scheduleTemplateCall failed:", e instanceof Error ? e.message : e);
  }
}

export async function setupScheduledTasks(): Promise<void> {
  try {
    const { Queue } = await import("bullmq");
    const conn = getConnection();
    if (!conn) { console.log("[Scheduler] Redis unavailable, skipping setup"); return; }

    const q = new Queue("scheduled-tasks", { connection: conn });

    const existing = await q.getRepeatableJobs();
    const alreadyExists = existing.some((j) => j.name === "check-overdue-invoices");

    if (!alreadyExists) {
      // Har kecha soat 01:00 UTC = 06:00 UZT
      await q.add("check-overdue-invoices", {}, {
        repeat: { pattern: "0 1 * * *" },
      });
      console.log("[Scheduler] Registered: check-overdue-invoices (daily 01:00 UTC / 06:00 UZT)");
    } else {
      console.log("[Scheduler] Already registered: check-overdue-invoices");
    }

    const hasAutomation = existing.some((j) => j.name === "run-call-automation");
    if (!hasAutomation) {
      // Har kuni soat 09:00 UZT (04:00 UTC)
      await q.add("run-call-automation", {}, {
        repeat: { pattern: "0 4 * * *" },
      });
      console.log("[Scheduler] Registered: run-call-automation (daily 09:00 UZT)");
    }

    await q.close();
  } catch (e) {
    console.warn("[Scheduler] setupScheduledTasks failed:", e instanceof Error ? e.message : e);
  }
}
