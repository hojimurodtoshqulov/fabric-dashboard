import { Worker } from "bullmq";
import { config } from "@/config";
import { db } from "@/lib/db";
import type { TemplateCallJobData, DtmfKey } from "@/types";
import * as goip from "@/services/goip/goip.provider";
import { emitToRole } from "@/lib/websocket";

const DTMF_WAIT_MS = 15_000;
const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_ATTEMPTS = 40; // 40 × 3s = 120s max

function getResultFromDtmf(key: string, dtmfKeys: DtmfKey[]): string {
  const found = dtmfKeys.find((k) => k.key === key);
  if (!found) return "ANSWERED";
  switch (found.action) {
    case "confirm_payment":  return "PAYMENT_CONFIRMED";
    case "promise_pay":      return "PROMISE_TO_PAY";
    case "callback":         return "CALLBACK_REQUESTED";
    case "interested":       return "INTERESTED";
    case "not_interested":   return "NOT_INTERESTED";
    default:                 return "ANSWERED";
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function startTemplateCallWorker() {
  const conn = (() => {
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
  })();

  if (!conn) {
    console.warn("[TemplateCallWorker] Redis unavailable — worker not started");
    return { close: async () => {} };
  }

  const worker = new Worker<TemplateCallJobData>(
    "template-calls",
    async (job) => {
      const { callId, clientId, clientName, clientPhone, callMode, audioFileUrl, dtmfConfig, context, attempt, maxAttempts } = job.data;

      const log = async (event: string, detail?: string) => {
        await db.callLog.create({ data: { callId, event, detail } }).catch(() => {});
      };

      try {
        // 1. Mark as DIALING
        await db.call.update({ where: { id: callId }, data: { status: "DIALING", startedAt: new Date(), attempt } });
        await log("DIALING", `Attempt ${attempt}/${maxAttempts}`);

        let finalAudioUrl: string | undefined = audioFileUrl;

        // 2. If AI_DYNAMIC mode — generate script and synthesize audio
        if (callMode === "AI_DYNAMIC" || !finalAudioUrl) {
          await log("AI_SCRIPT", "Generating dynamic script via OpenAI");
          const { generateCallScript } = await import("@/lib/ai/openai");
          const script = await generateCallScript({
            clientName,
            purpose: job.data.purpose,
            debtAmount: context.debtAmount,
            dueDate: context.dueDate,
            productName: context.productName,
            lastInteraction: context.lastInteraction,
          });
          await db.call.update({ where: { id: callId }, data: { script } });

          await log("TTS_SYNTHESIS", "Converting script to audio");
          const { synthesizeSpeech } = await import("@/lib/calls/tts");
          finalAudioUrl = await synthesizeSpeech(script, `call-${callId}`);
          await db.call.update({ where: { id: callId }, data: { audioUrl: finalAudioUrl } });
        }

        if (!finalAudioUrl) throw new Error("No audio URL available for call");

        // 3. Initiate call via GoIP
        await log("GOIP_DIAL", `Calling ${clientPhone}`);
        const callResult = await goip.makeCall({ phone: clientPhone, audioUrl: finalAudioUrl });
        if (!callResult.success) throw new Error(`GoIP dial failed: ${callResult.error}`);

        const goipCallId = callResult.callId!;
        await db.call.update({ where: { id: callId }, data: { status: "IN_PROGRESS", jobId: goipCallId } });
        await log("CALL_CONNECTED", `GoIP callId: ${goipCallId}`);

        // 4. Poll for completion
        let duration = 0;
        let dtmfKey: string | null = null;
        let finalStatus = "COMPLETED";

        for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
          await sleep(POLL_INTERVAL_MS);
          const status = await goip.getCallStatus(goipCallId);

          if (status.dtmf) {
            dtmfKey = status.dtmf;
            await log("DTMF_RECEIVED", `Key pressed: ${dtmfKey}`);
          }

          if (status.status === "COMPLETED" || status.status === "HANGUP") {
            duration = status.duration ?? 0;
            finalStatus = "COMPLETED";
            break;
          }
          if (status.status === "FAILED") { finalStatus = "FAILED"; break; }
          if (status.status === "BUSY")   { finalStatus = "BUSY";   break; }
          if (status.status === "NO_ANSWER") { finalStatus = "NO_ANSWER"; break; }
        }

        // 5. Wait extra for DTMF if not received yet and call completed
        if (!dtmfKey && finalStatus === "COMPLETED" && dtmfConfig?.keys?.length) {
          await sleep(DTMF_WAIT_MS);
          dtmfKey = await goip.getDTMF(goipCallId);
          if (dtmfKey) await log("DTMF_RECEIVED", `Key pressed: ${dtmfKey}`);
        }

        // 6. Determine call result
        let callResultType: string;
        if (finalStatus !== "COMPLETED") {
          callResultType = finalStatus === "BUSY" ? "BUSY" : "NO_ANSWER";
        } else if (dtmfKey && dtmfConfig?.keys?.length) {
          callResultType = getResultFromDtmf(dtmfKey, dtmfConfig.keys);
          // Save DTMF response
          const dtmfEntry = dtmfConfig.keys.find((k) => k.key === dtmfKey);
          if (dtmfEntry) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (db as any).callResponse.create({
              data: {
                callId,
                clientId,
                responseKey: dtmfKey,
                responseLabel: dtmfEntry.label,
              },
            }).catch(() => {});
          }
        } else {
          callResultType = "ANSWERED";
        }

        // 7. Save transcript if audio was played
        await db.callTranscript.create({
          data: { callId, speaker: "SYSTEM", text: `Template call played. Duration: ${duration}s` },
        }).catch(() => {});

        // 8. Final status update
        const prismaStatus = (["COMPLETED", "FAILED", "BUSY", "NO_ANSWER"].includes(finalStatus) ? finalStatus : "COMPLETED") as
          "COMPLETED" | "FAILED" | "BUSY" | "NO_ANSWER";

        await db.call.update({
          where: { id: callId },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: {
            status: prismaStatus,
            callResult: callResultType,
            duration,
            endedAt: new Date(),
          } as any,
        });

        await log(prismaStatus, `Result: ${callResultType}. Duration: ${duration}s`);

        emitToRole("DIRECTOR", "CALL_STATUS", { callId, clientName, status: prismaStatus, duration, callResult: callResultType });

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await log("FAILED", msg).catch(() => {});

        // Retry logic
        if (attempt < maxAttempts) {
          await db.call.update({ where: { id: callId }, data: { status: "PENDING", error: msg } });
          const { scheduleTemplateCall } = await import("@/lib/queue");
          await scheduleTemplateCall({ ...job.data, attempt: attempt + 1 }, 5 * 60 * 1000);
        } else {
          await db.call.update({ where: { id: callId }, data: { status: "FAILED", error: msg, endedAt: new Date() } });
          emitToRole("DIRECTOR", "CALL_STATUS", { callId, clientName, status: "FAILED" });
        }
        throw err;
      }
    },
    { connection: conn, concurrency: 3 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[TemplateCallWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log("[TemplateCallWorker] Started (queue: template-calls, concurrency: 3)");
  return worker;
}
