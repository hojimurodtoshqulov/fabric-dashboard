import { db } from "@/lib/db";
import { scheduleCall } from "@/lib/queue";
import type { CallPurpose } from "@prisma/client";

export class CallService {
  async initiateCall(data: {
    clientId: string;
    purpose: CallPurpose;
    scheduledAt?: Date;
    initiatedById: string;
    context?: Record<string, unknown>;
  }) {
    const client = await db.client.findUnique({
      where: { id: data.clientId },
      select: { id: true, name: true, phone: true },
    });
    if (!client) throw new Error("NOT_FOUND");

    const call = await db.call.create({
      data: {
        clientId: data.clientId,
        initiatedById: data.initiatedById,
        purpose: data.purpose,
        phone: client.phone,
        status: "PENDING",
        scheduledAt: data.scheduledAt,
        maxAttempts: 3,
      },
    });

    const delay = data.scheduledAt
      ? Math.max(0, data.scheduledAt.getTime() - Date.now())
      : 0;

    await scheduleCall(
      {
        callId: call.id,
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        purpose: data.purpose as string as "DEBT_REMINDER" | "REACTIVATION" | "OFFER" | "FOLLOW_UP",
        context: data.context || {},
        attempt: 1,
        maxAttempts: 3,
      },
      delay
    );

    return call;
  }

  async list(params: {
    page?: number;
    limit?: number;
    clientId?: string;
    status?: string;
    province?: string;
  }) {
    const { page = 1, limit = 20, clientId, status, province } = params;
    const skip = (page - 1) * limit;

    const callWhere = {
      ...(clientId && { clientId }),
      ...(status && { status: status as import("@prisma/client").CallStatus }),
      ...(province && { client: { province } }),
    };

    const [calls, total] = await Promise.all([
      db.call.findMany({
        where: callWhere,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { id: true, name: true, phone: true } },
          initiatedBy: { select: { id: true, name: true } },
          transcripts: { take: 1, orderBy: { createdAt: "asc" } },
        },
      }),
      db.call.count({ where: callWhere }),
    ]);

    return { calls, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(id: string) {
    return db.call.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        initiatedBy: { select: { id: true, name: true } },
        logs: { orderBy: { createdAt: "asc" } },
        transcripts: { orderBy: { createdAt: "asc" } },
      },
    });
  }

  async updateStatus(
    callId: string,
    status: string,
    data?: {
      duration?: number;
      audioUrl?: string;
      error?: string;
      startedAt?: Date;
      endedAt?: Date;
    }
  ) {
    return db.call.update({
      where: { id: callId },
      data: { status: status as Parameters<typeof db.call.update>[0]["data"]["status"], ...data },
    });
  }

  async addLog(callId: string, event: string, detail?: string) {
    return db.callLog.create({
      data: { callId, event, detail },
    });
  }

  async addTranscript(
    callId: string,
    speaker: string,
    text: string,
    confidence?: number
  ) {
    return db.callTranscript.create({
      data: { callId, speaker, text, confidence },
    });
  }

  async getStats() {
    const [total, completed, failed, noAnswer] = await Promise.all([
      db.call.count(),
      db.call.count({ where: { status: "COMPLETED" } }),
      db.call.count({ where: { status: "FAILED" } }),
      db.call.count({ where: { status: "NO_ANSWER" } }),
    ]);

    return {
      total,
      completed,
      failed,
      noAnswer,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }
}

export const callService = new CallService();
