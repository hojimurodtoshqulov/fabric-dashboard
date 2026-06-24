import { db } from "@/lib/db";
import { getCache, setCache, deleteCache, CACHE_KEYS } from "@/lib/cache";
import { scheduleMessage, scheduleCall, scheduleDebtReminder } from "@/lib/queue";
import type { ClientStatus } from "@/constants";
import type { PaginationParams } from "@/types";

export class ClientService {
  async list(params: PaginationParams & { status?: ClientStatus; segmentId?: string }) {
    const { page = 1, limit = 20, search, status, segmentId, sortBy = "createdAt", sortOrder = "desc" } = params;
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search } },
          { company: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(status && { status }),
      ...(segmentId && { segmentId }),
    };

    const [clients, total] = await Promise.all([
      db.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          segment: { select: { id: true, name: true, color: true } },
          assignedTo: { select: { id: true, name: true } },
          _count: { select: { invoices: true, tasks: true, calls: true } },
        },
      }),
      db.client.count({ where }),
    ]);

    return { clients, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(id: string) {
    const cached = await getCache<Awaited<ReturnType<typeof db.client.findUnique>>>(
      CACHE_KEYS.client(id)
    );
    if (cached) return cached;

    const client = await db.client.findUnique({
      where: { id },
      include: {
        segment: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        leadSource: true,
        _count: {
          select: { invoices: true, tasks: true, calls: true, messages: true },
        },
      },
    });

    if (client) {
      await setCache(CACHE_KEYS.client(id), client, 60);
    }
    return client;
  }

  async create(data: {
    name: string;
    phone: string;
    company?: string;
    email?: string;
    address?: string;
    region?: string;
    status?: ClientStatus;
    segmentId?: string;
    assignedToId?: string;
    leadSourceId?: string;
    notes?: string;
    tags?: string[];
    createdById: string;
  }) {
    const client = await db.client.create({
      data: {
        ...data,
        lastActivity: new Date(),
      },
      include: {
        segment: true,
        assignedTo: { select: { id: true, name: true } },
      },
    });
    return client;
  }

  async update(id: string, data: Partial<{
    name: string;
    phone: string;
    company: string;
    email: string;
    address: string;
    region: string;
    status: ClientStatus;
    segmentId: string;
    assignedToId: string;
    notes: string;
    tags: string[];
    telegramId: string;
  }>) {
    const client = await db.client.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
    await deleteCache(CACHE_KEYS.client(id));
    return client;
  }

  async delete(id: string) {
    await db.client.delete({ where: { id } });
    await deleteCache(CACHE_KEYS.client(id));
  }

  async updateStatus(id: string, status: ClientStatus) {
    const client = await db.client.update({
      where: { id },
      data: { status, lastActivity: new Date() },
    });
    await deleteCache(CACHE_KEYS.client(id));

    // Trigger automations
    await this.triggerStatusAutomation(client.id, status, client.phone, client.name);
    return client;
  }

  async triggerStatusAutomation(
    clientId: string,
    status: ClientStatus,
    phone: string,
    name: string
  ) {
    const callInitiatorId = await this.getSystemUserId();

    if (status === "INACTIVE") {
      await scheduleMessage({
        type: "TELEGRAM",
        to: phone,
        clientId,
        message: `Salom ${name}! Sizi yangi mahsulotlarimiz bilan tanishtirmoqchimiz. Aloqa o'rnataylik!`,
        metadata: { purpose: "REACTIVATION" },
      }, 5 * 60 * 1000);
    }

    if (status === "LOST") {
      await scheduleCall({
        callId: `auto-${clientId}-lost`,
        clientId,
        clientName: name,
        clientPhone: phone,
        purpose: "REACTIVATION",
        context: { lastInteraction: new Date().toISOString() },
        attempt: 1,
        maxAttempts: 2,
      }, 24 * 60 * 60 * 1000);
    }

    if (status === "DEBTOR") {
      const debts = await db.debt.findMany({
        where: { clientId, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
        orderBy: { dueDate: "asc" },
        take: 1,
      });
      if (debts[0]) {
        await scheduleDebtReminder({
          debtId: debts[0].id,
          clientId,
          type: "AI_CALL",
        }, 2 * 60 * 60 * 1000);
      }
    }
  }

  async recordActivity(clientId: string) {
    await db.client.update({
      where: { id: clientId },
      data: { lastActivity: new Date() },
    });
  }

  async getStats() {
    const stats = await db.client.groupBy({
      by: ["status"],
      _count: true,
    });

    return stats.reduce(
      (acc, { status, _count }) => {
        acc[status] = _count;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  private async getSystemUserId(): Promise<string> {
    const director = await db.user.findFirst({
      where: { role: { name: "DIRECTOR" } },
      select: { id: true },
    });
    return director?.id || "";
  }
}

export const clientService = new ClientService();
