import axios from "axios";
import { config } from "@/config";
import { db } from "@/lib/db";

const BASE_URL = `https://api.telegram.org/bot${config.telegram.botToken}`;

export class TelegramProvider {
  async sendMessage(chatId: string, text: string, options?: {
    parseMode?: "HTML" | "Markdown";
    replyMarkup?: unknown;
  }) {
    const response = await axios.post(`${BASE_URL}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: options?.parseMode || "HTML",
      reply_markup: options?.replyMarkup,
    });

    return response.data;
  }

  async sendBulk(recipients: Array<{ chatId: string; message: string }>) {
    const results = [];
    for (const recipient of recipients) {
      try {
        const result = await this.sendMessage(recipient.chatId, recipient.message);
        results.push({ chatId: recipient.chatId, success: true, result });
        await sleep(50);
      } catch (error) {
        results.push({
          chatId: recipient.chatId,
          success: false,
          error: error instanceof Error ? error.message : "Failed",
        });
      }
    }
    return results;
  }

  async logMessage(data: {
    clientId?: string;
    chatId: string;
    messageId?: string;
    direction: "OUTBOUND" | "INBOUND";
    text: string;
    isBot?: boolean;
  }) {
    return db.telegramLog.create({
      data: {
        clientId: data.clientId,
        chatId: data.chatId,
        messageId: data.messageId,
        direction: data.direction,
        text: data.text,
        isBot: data.isBot || false,
      },
    });
  }

  async processWebhook(body: TelegramWebhookBody) {
    const message = body.message || body.channel_post;
    if (!message) return;

    const chatId = String(message.chat.id);
    const text = message.text || "";

    await this.logMessage({
      chatId,
      direction: "INBOUND",
      text,
      isBot: message.from?.is_bot || false,
    });

    // Find client by telegram chatId
    const client = await db.client.findFirst({
      where: { telegramId: chatId },
    });

    if (client) {
      await db.client.update({
        where: { id: client.id },
        data: { lastActivity: new Date() },
      });

      // Auto-reply logic
      if (text.toLowerCase().includes("to'lovim") || text.toLowerCase().includes("qarzim")) {
        const debts = await db.debt.findMany({
          where: { clientId: client.id, status: { not: "PAID" } },
          take: 3,
        });

        if (debts.length > 0) {
          const debtInfo = debts
            .map((d) => `📌 ${d.amount.toString()} so'm (muddat: ${d.dueDate.toLocaleDateString()})`)
            .join("\n");
          await this.sendMessage(chatId, `Hurmatli ${client.name},\n\nMavjud qarzlaringiz:\n${debtInfo}\n\nTo'lov uchun bizga murojaat qiling.`);
        } else {
          await this.sendMessage(chatId, `Hurmatli ${client.name}, hozirda sizda qarzdorlik yo'q. ✅`);
        }
      }
    }

    return { chatId, text, clientId: client?.id };
  }
}

interface TelegramWebhookBody {
  message?: {
    chat: { id: number };
    from?: { is_bot?: boolean };
    text?: string;
    message_id?: number;
  };
  channel_post?: {
    chat: { id: number };
    from?: { is_bot?: boolean };
    text?: string;
    message_id?: number;
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const telegramProvider = new TelegramProvider();
