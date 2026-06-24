import axios from "axios";
import { config } from "@/config";
import { db } from "@/lib/db";

export class SMSProvider {
  async send(phone: string, message: string): Promise<{
    success: boolean;
    externalId?: string;
    error?: string;
  }> {
    try {
      const response = await axios.post(
        config.sms.apiUrl,
        {
          to: this.formatPhone(phone),
          from: config.sms.senderId,
          text: message,
        },
        {
          headers: {
            Authorization: `Bearer ${config.sms.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      return {
        success: true,
        externalId: response.data?.message_id || response.data?.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "SMS send failed",
      };
    }
  }

  async sendBulk(recipients: Array<{ phone: string; message: string }>) {
    const results = [];
    for (const r of recipients) {
      const result = await this.send(r.phone, r.message);
      results.push({ phone: r.phone, ...result });
      await sleep(100);
    }
    return results;
  }

  async logSMS(data: {
    clientId?: string;
    phone: string;
    message: string;
    status: string;
    externalId?: string;
  }) {
    return db.sMSLog.create({
      data: {
        clientId: data.clientId,
        phone: data.phone,
        message: data.message,
        status: data.status,
        externalId: data.externalId,
        provider: "local",
        sentAt: data.status === "SENT" ? new Date() : undefined,
      },
    });
  }

  formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("998")) return `+${cleaned}`;
    if (cleaned.startsWith("0")) return `+998${cleaned.slice(1)}`;
    if (cleaned.length === 9) return `+998${cleaned}`;
    return `+${cleaned}`;
  }

  buildDebtReminderMessage(
    clientName: string,
    amount: number,
    dueDate: string
  ): string {
    return `Hurmatli ${clientName}! Sizning ${amount.toLocaleString()} so'mlik qarzingiz to'lov muddati ${dueDate}. Iltimos, o'z vaqtida to'lang. Murojaat: +998901234567`;
  }

  buildOfferMessage(clientName: string, productName: string, discount: number): string {
    return `Hurmatli ${clientName}! ${productName} mahsulotiga ${discount}% chegirma mavjud. Buyurtma uchun: +998901234567`;
  }

  buildReactivationMessage(clientName: string): string {
    return `Hurmatli ${clientName}! Sizi yo'qladik! Yangi mahsulotlarimiz bilan tanishish uchun bizga murojaat qiling. +998901234567`;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const smsProvider = new SMSProvider();
