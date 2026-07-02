import { db } from "@/lib/db";
import { scheduleDebtReminder, scheduleCall } from "@/lib/queue";
import { emitToRole } from "@/lib/websocket";
import type { InvoiceStatus, PaymentMethod } from "@prisma/client";
import dayjs from "dayjs";

export class InvoiceService {
  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: InvoiceStatus;
    clientId?: string;
    province?: string;
  }) {
    const { page = 1, limit = 20, search, status, clientId, province } = params;
    const skip = (page - 1) * limit;

    const where = {
      ...(clientId && { clientId }),
      ...(status && { status }),
      ...(province && { client: { province } }),
      ...(search && {
        OR: [
          { number: { contains: search } },
          { client: { name: { contains: search, mode: "insensitive" as const } } },
        ],
      }),
    };

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { id: true, name: true, phone: true } },
          createdBy: { select: { id: true, name: true } },
          items: true,
          _count: { select: { payments: true } },
        },
      }),
      db.invoice.count({ where }),
    ]);

    return { invoices, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(id: string) {
    return db.invoice.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, phone: true, address: true } },
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        payments: true,
        debt: true,
      },
    });
  }

  async create(data: {
    clientId: string;
    createdById: string;
    items: Array<{
      productId?: string;
      name: string;
      description?: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
    }>;
    discount?: number;
    tax?: number;
    dueDate?: Date | string;
    notes?: string;
  }) {
    const number = await this.generateInvoiceNumber();

    const items = data.items.map((item) => {
      const total =
        item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
      return { ...item, discount: item.discount || 0, total };
    });

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = (subtotal * (data.discount || 0)) / 100;
    const taxAmount = ((subtotal - discountAmount) * (data.tax || 0)) / 100;
    const total = subtotal - discountAmount + taxAmount;

    const invoice = await db.invoice.create({
      data: {
        number,
        clientId: data.clientId,
        createdById: data.createdById,
        subtotal,
        discount: data.discount || 0,
        tax: data.tax || 0,
        total,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        notes: data.notes,
        status: data.dueDate ? "SENT" : "DRAFT",
        items: {
          create: items,
        },
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        items: true,
      },
    });

    return invoice;
  }

  async addPayment(
    invoiceId: string,
    data: {
      amount: number;
      method: PaymentMethod;
      reference?: string;
      notes?: string;
    }
  ) {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true, debt: true },
    });
    if (!invoice) throw new Error("NOT_FOUND");

    const payment = await db.payment.create({
      data: {
        invoiceId,
        amount: data.amount,
        method: data.method,
        reference: data.reference,
        notes: data.notes,
      },
    });

    const newPaid = Number(invoice.paid) + data.amount;
    const newStatus: InvoiceStatus =
      newPaid >= Number(invoice.total)
        ? "PAID"
        : newPaid > 0
        ? "PARTIAL"
        : invoice.status;

    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        paid: newPaid,
        status: newStatus,
        paidAt: newStatus === "PAID" ? new Date() : undefined,
      },
    });

    // Update debt if exists
    if (invoice.debt) {
      await this.updateDebtOnPayment(invoice.debt.toString(), data.amount);
    }

    // Update client status if fully paid
    if (newStatus === "PAID") {
      await db.client.update({
        where: { id: invoice.clientId },
        data: { status: "ACTIVE", lastActivity: new Date() },
      });
    }

    return payment;
  }

  async checkOverdueInvoices() {
    const overdueInvoices = await db.invoice.findMany({
      where: {
        status: { in: ["DRAFT", "SENT", "PARTIAL"] },
        dueDate: { lt: new Date() },
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
      },
    });

    for (const invoice of overdueInvoices) {
      await db.invoice.update({
        where: { id: invoice.id },
        data: { status: "OVERDUE" },
      });

      // Create or update debt
      await db.debt.upsert({
        where: { invoiceId: invoice.id },
        create: {
          clientId: invoice.clientId,
          invoiceId: invoice.id,
          amount: Number(invoice.total) - Number(invoice.paid),
          dueDate: invoice.dueDate!,
          status: "OVERDUE",
        },
        update: {
          status: "OVERDUE",
          amount: Number(invoice.total) - Number(invoice.paid),
        },
      });

      // Update client status
      await db.client.update({
        where: { id: invoice.clientId },
        data: { status: "DEBTOR" },
      });

      // Fire-and-forget: Redis bo'lmasa bloklanmasin
      scheduleCall({
        callId: `overdue-${invoice.id}`,
        clientId: invoice.clientId,
        clientName: invoice.client.name,
        clientPhone: invoice.client.phone,
        purpose: "DEBT_REMINDER",
        context: {
          debtAmount: Number(invoice.total) - Number(invoice.paid),
          dueDate: invoice.dueDate?.toISOString(),
        },
        attempt: 1,
        maxAttempts: 3,
      }).catch((e) => console.warn("[checkOverdue] scheduleCall:", e?.message));

      try {
        emitToRole("DIRECTOR", "DEBT_ALERT", {
          invoiceId: invoice.id,
          clientName: invoice.client.name,
          amount: Number(invoice.total) - Number(invoice.paid),
        });
      } catch {}

    }

    return overdueInvoices.length;
  }

  async sendReminder(invoiceId: string) {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true, debt: true },
    });
    if (!invoice) throw new Error("NOT_FOUND");

    const daysLeft = dayjs(invoice.dueDate).diff(dayjs(), "day");
    const remaining = Number(invoice.total) - Number(invoice.paid);

    await scheduleDebtReminder({
      debtId: invoice.id,
      clientId: invoice.clientId,
      type: "SMS",
    });

    return { success: true, daysLeft, remaining };
  }

  private async updateDebtOnPayment(debtId: string, amount: number) {
    const debt = await db.debt.findFirst({ where: { invoiceId: debtId } });
    if (!debt) return;

    const newPaid = Number(debt.paidAmount) + amount;
    const remaining = Number(debt.amount) - newPaid;

    await db.debt.update({
      where: { id: debt.id },
      data: {
        paidAmount: newPaid,
        status: remaining <= 0 ? "PAID" : "PARTIAL",
        resolvedAt: remaining <= 0 ? new Date() : undefined,
      },
    });
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await db.invoice.count({
      where: { createdAt: { gte: new Date(`${year}-01-01`) } },
    });
    return `INV-${year}-${String(count + 1).padStart(5, "0")}`;
  }
}

export const invoiceService = new InvoiceService();
