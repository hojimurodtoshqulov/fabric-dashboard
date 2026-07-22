import type { User, Role, Client, Invoice, Task } from "@prisma/client";
import type { Permission, RoleName } from "@/constants";

// Auth types
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: RoleName;
  permissions: Permission[];
  image?: string | null;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Query types
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Client types
export interface ClientWithRelations extends Client {
  segment?: { name: string } | null;
  assignedTo?: Pick<User, "id" | "name" | "email"> | null;
  _count?: {
    invoices: number;
    tasks: number;
    calls: number;
  };
}

// Invoice types
export interface InvoiceWithRelations extends Invoice {
  client: Pick<Client, "id" | "name" | "phone">;
  createdBy: Pick<User, "id" | "name">;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Task types
export interface TaskWithRelations extends Task {
  assignedTo?: Pick<User, "id" | "name"> | null;
  createdBy: Pick<User, "id" | "name">;
  client?: Pick<Client, "id" | "name"> | null;
  _count?: { comments: number };
}

// Analytics types
export interface SalesAnalytics {
  period: string;
  totalSales: number;
  totalInvoices: number;
  totalPaid: number;
  totalUnpaid: number;
  conversionRate: number;
}

export interface ClientAnalytics {
  total: number;
  active: number;
  inactive: number;
  lost: number;
  debtors: number;
  prospects: number;
  retentionRate: number;
  lostRate: number;
}

// Call types
export interface CallJobData {
  callId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  purpose: "DEBT_REMINDER" | "REACTIVATION" | "OFFER" | "FOLLOW_UP" | "SURVEY";
  context: {
    debtAmount?: number;
    dueDate?: string;
    productName?: string;
    lastInteraction?: string;
  };
  attempt: number;
  maxAttempts: number;
}

export interface TemplateCallJobData {
  callId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  purpose: string;
  callMode: "TEMPLATE" | "AI_DYNAMIC" | "AI_CONVERSATION";
  voiceTemplateId?: string;
  audioFileUrl?: string;
  dtmfConfig?: DtmfConfig | null;
  context: {
    debtAmount?: number;
    dueDate?: string;
    productName?: string;
    lastInteraction?: string;
  };
  attempt: number;
  maxAttempts: number;
  sendSmsAfterCall?: boolean;
  smsText?: string | null;
}

export interface DtmfKey {
  key: string;
  label: string;
  action?: "confirm_payment" | "promise_pay" | "callback" | "interested" | "not_interested" | "transfer_manager" | "custom";
}

export interface DtmfConfig {
  keys: DtmfKey[];
  timeout?: number;
}

// Message types
export interface MessageJobData {
  type: "TELEGRAM" | "SMS";
  to: string;
  message: string;
  clientId?: string;
  metadata?: Record<string, unknown>;
}

// WebSocket events
export type WSEventType =
  | "NOTIFICATION"
  | "CLIENT_UPDATED"
  | "TASK_ASSIGNED"
  | "CALL_STATUS"
  | "DEBT_ALERT"
  | "NEW_LEAD";

export interface WSEvent<T = unknown> {
  type: WSEventType;
  payload: T;
  timestamp: string;
}
