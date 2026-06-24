import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^(\+998|998|0)?[0-9]{9}$/, "Noto'g'ri telefon raqam"),
  company: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(200).optional(),
  region: z.string().max(100).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "LOST", "DEBTOR", "PROSPECT", "COMPETITOR", "RISK"]).optional(),
  segmentId: z.string().cuid().optional(),
  assignedToId: z.string().cuid().optional(),
  leadSourceId: z.string().cuid().optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  telegramId: z.string().optional(),
});

export const invoiceSchema = z.object({
  clientId: z.string().cuid(),
  items: z.array(z.object({
    productId: z.string().cuid().optional(),
    name: z.string().min(1),
    description: z.string().optional(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    discount: z.number().min(0).max(100).optional(),
  })).min(1),
  discount: z.number().min(0).max(100).optional(),
  tax: z.number().min(0).max(100).optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export const paymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(["CASH", "BANK_TRANSFER", "CARD", "CRYPTO", "OTHER"]),
  reference: z.string().max(100).optional(),
  notes: z.string().max(300).optional(),
});

export const taskSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignedToId: z.string().cuid().optional(),
  clientId: z.string().cuid().optional(),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
});

export const callSchema = z.object({
  clientId: z.string(),
  purpose: z.enum(["DEBT_REMINDER", "REACTIVATION", "OFFER", "FOLLOW_UP", "SURVEY"]),
  scheduledAt: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const messageSchema = z.object({
  type: z.enum(["TELEGRAM", "SMS"]),
  to: z.string(),
  message: z.string().min(1).max(1600),
  clientId: z.string().cuid().optional(),
});

export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = String(result.error);
    return { success: false, error: errors };
  }
  return { success: true, data: result.data };
}
