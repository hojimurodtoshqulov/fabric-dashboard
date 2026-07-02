import { Worker } from "bullmq";
import { invoiceService } from "@/services/sales/invoice.service";
import { config } from "@/config";

function getConn() {
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

export function startSchedulerWorker() {
  const conn = getConn();
  if (!conn) {
    console.warn("[SchedulerWorker] Redis unavailable, worker not started");
    return { close: async () => {} };
  }

  const worker = new Worker(
    "scheduled-tasks",
    async (job) => {
      if (job.name === "check-overdue-invoices") {
        console.log("[SchedulerWorker] Running: check-overdue-invoices");
        const processed = await invoiceService.checkOverdueInvoices();
        console.log(`[SchedulerWorker] Done: ${processed} ta faktura qayta ishlandi`);
        return { processed };
      }
    },
    { connection: conn, concurrency: 1 }
  );

  worker.on("completed", (job, result) => {
    console.log(`[SchedulerWorker] ✓ ${job.name}`, result);
  });
  worker.on("failed", (job, err) => {
    console.error(`[SchedulerWorker] ✗ ${job?.name}:`, err.message);
  });

  return worker;
}
