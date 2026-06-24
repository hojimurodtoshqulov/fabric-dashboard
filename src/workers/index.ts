import { startCallWorker } from "./calls/call.worker";
import { startMessageWorker } from "./messaging/message.worker";

console.log("[Workers] Starting BullMQ workers...");

const callWorker = startCallWorker();
const messageWorker = startMessageWorker();

console.log("[Workers] All workers started");

process.on("SIGTERM", async () => {
  console.log("[Workers] Shutting down...");
  await callWorker.close();
  await messageWorker.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await callWorker.close();
  await messageWorker.close();
  process.exit(0);
});
