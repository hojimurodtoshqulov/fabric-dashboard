import { Worker } from "bullmq";
import { config } from "@/config";
import { QUEUE_NAMES } from "@/constants";

function getConnection() {
  const url = new URL(config.redis.url);
  return { host: url.hostname, port: Number(url.port) || 6379, password: config.redis.password || url.password || undefined, maxRetriesPerRequest: null as unknown as number };
}
import { goipClient } from "@/lib/calls/goip";
import { synthesizeSpeech, transcribeAudio } from "@/lib/calls/tts";
import { generateCallScript } from "@/lib/ai/openai";
import { callService } from "@/services/calls/call.service";
import { emitToRole } from "@/lib/websocket";
import type { CallJobData } from "@/types";
import { nanoid } from "nanoid";

export function startCallWorker() {
  const worker = new Worker<CallJobData>(
    QUEUE_NAMES.AI_CALLS,
    async (job) => {
      const data = job.data;
      const { callId, clientId, clientName, clientPhone, purpose, context } = data;

      console.log(`[CallWorker] Processing call ${callId} for ${clientName}`);

      try {
        // 1. Update status: DIALING
        await callService.updateStatus(callId, "DIALING", {
          startedAt: new Date(),
        });
        await callService.addLog(callId, "DIALING", `Dialing ${clientPhone}`);

        // 2. Generate dynamic script via OpenAI
        await callService.addLog(callId, "SCRIPT_GENERATION", "Generating AI script");
        const script = await generateCallScript({
          clientName,
          purpose,
          debtAmount: context.debtAmount,
          dueDate: context.dueDate,
          productName: context.productName,
          lastInteraction: context.lastInteraction,
        });

        await callService.updateStatus(callId, "IN_PROGRESS", {});

        // 3. Convert script to audio via Google TTS
        await callService.addLog(callId, "TTS_SYNTHESIS", "Converting script to audio");
        const audioFilename = `call-${callId}-${nanoid(8)}`;
        const audioUrl = await synthesizeSpeech(script, audioFilename);

        await callService.updateStatus(callId, "IN_PROGRESS", { audioUrl });

        // 4. Initiate actual call via GoIP
        await callService.addLog(callId, "GOIP_CALL", `Initiating GoIP call to ${clientPhone}`);
        const callResult = await goipClient.initiateCall({
          phone: clientPhone,
          audioUrl,
        });

        if (!callResult.success) {
          throw new Error(callResult.error || "GoIP call failed");
        }

        await callService.addLog(callId, "CALL_CONNECTED", `GoIP call ID: ${callResult.callId}`);

        // 5. Wait for call to complete (polling)
        let duration = 0;
        if (callResult.callId) {
          duration = await waitForCallCompletion(callResult.callId);
        }

        // 6. Save transcript (client response - simulated from audio recording)
        await callService.addTranscript(callId, "BOT", script, 1.0);

        // 7. Update final status
        await callService.updateStatus(callId, "COMPLETED", {
          duration,
          endedAt: new Date(),
        });

        await callService.addLog(callId, "COMPLETED", `Call completed. Duration: ${duration}s`);

        // 8. Notify via WebSocket
        emitToRole("DIRECTOR", "CALL_STATUS", {
          callId,
          clientName,
          status: "COMPLETED",
          duration,
        });

        return { success: true, callId, duration };
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Unknown error";

        await callService.updateStatus(callId, "FAILED", {
          error: errMsg,
          endedAt: new Date(),
        });
        await callService.addLog(callId, "FAILED", errMsg);

        emitToRole("DIRECTOR", "CALL_STATUS", {
          callId,
          clientName,
          status: "FAILED",
          error: errMsg,
        });

        throw error;
      }
    },
    {
      connection: getConnection(),
      concurrency: 3,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[CallWorker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[CallWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

async function waitForCallCompletion(goipCallId: string): Promise<number> {
  const maxWait = 120;
  let waited = 0;

  while (waited < maxWait) {
    await sleep(5000);
    waited += 5;

    const status = await goipClient.getCallStatus(goipCallId);
    if (status.includes("COMPLETED") || status.includes("HANGUP")) {
      break;
    }
    if (status.includes("FAILED") || status.includes("BUSY") || status.includes("NO_ANSWER")) {
      throw new Error(`Call ended with status: ${status}`);
    }
  }

  return waited;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
