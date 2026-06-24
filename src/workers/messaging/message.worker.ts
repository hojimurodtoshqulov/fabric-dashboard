import { Worker } from "bullmq";
import { config } from "@/config";
import { QUEUE_NAMES } from "@/constants";

function getConnection() {
  const url = new URL(config.redis.url);
  return { host: url.hostname, port: Number(url.port) || 6379, password: config.redis.password || url.password || undefined, maxRetriesPerRequest: null as unknown as number };
}
import { telegramProvider } from "@/lib/messaging/telegram";
import { smsProvider } from "@/lib/messaging/sms";
import { db } from "@/lib/db";
import type { MessageJobData } from "@/types";

export function startMessageWorker() {
  const worker = new Worker<MessageJobData>(
    QUEUE_NAMES.MESSAGES,
    async (job) => {
      const { type, to, message, clientId, metadata } = job.data;

      if (type === "TELEGRAM") {
        const result = await telegramProvider.sendMessage(to, message);

        await telegramProvider.logMessage({
          clientId,
          chatId: to,
          direction: "OUTBOUND",
          text: message,
          isBot: true,
        });

        return result;
      }

      if (type === "SMS") {
        const result = await smsProvider.send(to, message);

        await smsProvider.logSMS({
          clientId,
          phone: to,
          message,
          status: result.success ? "SENT" : "FAILED",
          externalId: result.externalId,
        });

        if (!result.success) throw new Error(result.error || "SMS failed");

        return result;
      }

      throw new Error(`Unknown message type: ${type}`);
    },
    {
      connection: getConnection(),
      concurrency: 10,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[MessageWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
