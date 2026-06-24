import { db } from "@/lib/db";
import { emitToUser } from "@/lib/websocket";
import { scheduleMessage } from "@/lib/queue";
import type { NotificationType } from "@prisma/client";

export class NotificationService {
  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
    metadata?: Record<string, unknown>;
    channels?: Array<"IN_APP" | "TELEGRAM" | "SMS">;
  }) {
    const notification = await db.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        link: data.link,
        metadata: data.metadata ? (data.metadata as import("@prisma/client").Prisma.InputJsonValue) : undefined,
      },
    });

    // Real-time push
    emitToUser(data.userId, "NOTIFICATION", {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      link: notification.link,
    });

    // Cross-channel delivery
    if (data.channels?.includes("TELEGRAM")) {
      const user = await db.user.findUnique({
        where: { id: data.userId },
        select: { phone: true },
      });
      if (user?.phone) {
        const client = await db.client.findFirst({
          where: { phone: user.phone, telegramId: { not: null } },
          select: { telegramId: true },
        });
        if (client?.telegramId) {
          await scheduleMessage({
            type: "TELEGRAM",
            to: client.telegramId,
            message: `🔔 ${data.title}\n\n${data.body}`,
          });
        }
      }
    }

    return notification;
  }

  async notifyRole(
    role: string,
    type: NotificationType,
    title: string,
    body: string,
    link?: string
  ) {
    const users = await db.user.findMany({
      where: { role: { name: role }, isActive: true },
      select: { id: true },
    });

    await Promise.all(
      users.map((user) =>
        this.create({ userId: user.id, type, title, body, link })
      )
    );
  }

  async markRead(id: string, userId: string) {
    return db.notification.update({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return db.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async list(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.notification.count({ where: { userId } }),
      db.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { notifications, total, unreadCount, page, limit };
  }

  async triggerDebtAlert(
    clientId: string,
    debtAmount: number,
    daysOverdue: number
  ) {
    const directors = await db.user.findMany({
      where: { role: { name: "DIRECTOR" }, isActive: true },
      select: { id: true },
    });

    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { name: true },
    });

    for (const director of directors) {
      await this.create({
        userId: director.id,
        type: "OVERDUE_DEBT",
        title: "Muddati o'tgan qarz!",
        body: `${client?.name} - ${debtAmount.toLocaleString()} so'm (${daysOverdue} kun kech)`,
        link: `/crm/clients/${clientId}`,
      });
    }
  }

  async triggerNewLead(clientId: string, leadName: string) {
    await this.notifyRole(
      "DIRECTOR",
      "NEW_LEAD",
      "Yangi lead!",
      `${leadName} yangi potensial mijoz sifatida qo'shildi.`,
      `/crm/clients/${clientId}`
    );
  }

  async triggerLowStock(productId: string, productName: string, stock: number) {
    await this.notifyRole(
      "DIRECTOR",
      "LOW_STOCK",
      "Kam qoldi!",
      `${productName} - Qoldi: ${stock} dona`,
      `/sales/products/${productId}`
    );
  }
}

export const notificationService = new NotificationService();
