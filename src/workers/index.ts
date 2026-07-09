import { startCallWorker } from "./calls/call.worker";
import { startTemplateCallWorker } from "./calls/template-call.worker";
import { startMessageWorker } from "./messaging/message.worker";
import { startSchedulerWorker } from "./scheduler/scheduler.worker";
import { setupScheduledTasks } from "@/lib/queue";

console.log("[Workers] Starting BullMQ workers...");

const callWorker         = startCallWorker();
const templateCallWorker = startTemplateCallWorker();
const messageWorker      = startMessageWorker();
const schedulerWorker    = startSchedulerWorker();

setupScheduledTasks().catch((e) =>
  console.error("[Workers] Failed to setup scheduled tasks:", e)
);

console.log("[Workers] All workers started");

process.on("SIGTERM", async () => {
  console.log("[Workers] Shutting down...");
  await callWorker.close();
  await templateCallWorker.close();
  await messageWorker.close();
  await schedulerWorker.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await callWorker.close();
  await templateCallWorker.close();
  await messageWorker.close();
  await schedulerWorker.close();
  process.exit(0);
});
