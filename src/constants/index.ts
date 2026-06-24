export const ROLES = {
  DIRECTOR: "DIRECTOR",
  MANAGER: "MANAGER",
  WORKER: "WORKER",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const CLIENT_STATUSES = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  LOST: "LOST",
  DEBTOR: "DEBTOR",
  PROSPECT: "PROSPECT",
  COMPETITOR: "COMPETITOR",
  RISK: "RISK",
} as const;

export type ClientStatus = (typeof CLIENT_STATUSES)[keyof typeof CLIENT_STATUSES];

export const INVOICE_STATUSES = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  PAID: "PAID",
  PARTIAL: "PARTIAL",
  OVERDUE: "OVERDUE",
  CANCELLED: "CANCELLED",
} as const;

export const CALL_STATUSES = {
  PENDING: "PENDING",
  DIALING: "DIALING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  NO_ANSWER: "NO_ANSWER",
  BUSY: "BUSY",
} as const;

export const TASK_STATUSES = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  REVIEW: "REVIEW",
  DONE: "DONE",
} as const;

export const TASK_PRIORITIES = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;

export const NOTIFICATION_TYPES = {
  IN_APP: "IN_APP",
  TELEGRAM: "TELEGRAM",
  SMS: "SMS",
  AI_CALL: "AI_CALL",
} as const;

export const QUEUE_NAMES = {
  AI_CALLS: "ai-calls",
  MESSAGES: "messages",
  NOTIFICATIONS: "notifications",
  ANALYTICS: "analytics",
  DEBT_REMINDERS: "debt-reminders",
} as const;

export const PERMISSIONS = {
  // Clients
  CLIENTS_READ: "clients:read",
  CLIENTS_CREATE: "clients:create",
  CLIENTS_UPDATE: "clients:update",
  CLIENTS_DELETE: "clients:delete",
  // Sales
  SALES_READ: "sales:read",
  SALES_CREATE: "sales:create",
  SALES_UPDATE: "sales:update",
  SALES_DELETE: "sales:delete",
  // Tasks
  TASKS_READ: "tasks:read",
  TASKS_CREATE: "tasks:create",
  TASKS_UPDATE: "tasks:update",
  TASKS_DELETE: "tasks:delete",
  // Analytics
  ANALYTICS_READ: "analytics:read",
  ANALYTICS_EXPORT: "analytics:export",
  // Marketing
  MARKETING_READ: "marketing:read",
  MARKETING_CREATE: "marketing:create",
  MARKETING_UPDATE: "marketing:update",
  // Settings
  SETTINGS_READ: "settings:read",
  SETTINGS_UPDATE: "settings:update",
  // Users
  USERS_READ: "users:read",
  USERS_CREATE: "users:create",
  USERS_UPDATE: "users:update",
  USERS_DELETE: "users:delete",
  // AI Calls
  CALLS_READ: "calls:read",
  CALLS_CREATE: "calls:create",
  // Messages
  MESSAGES_READ: "messages:read",
  MESSAGES_SEND: "messages:send",
  // Website
  WEBSITE_READ: "website:read",
  WEBSITE_UPDATE: "website:update",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  DIRECTOR: Object.values(PERMISSIONS) as Permission[],
  MANAGER: [
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_CREATE,
    PERMISSIONS.CLIENTS_UPDATE,
    PERMISSIONS.SALES_READ,
    PERMISSIONS.SALES_CREATE,
    PERMISSIONS.SALES_UPDATE,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_UPDATE,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.MARKETING_READ,
    PERMISSIONS.MARKETING_CREATE,
    PERMISSIONS.MARKETING_UPDATE,
    PERMISSIONS.MESSAGES_READ,
    PERMISSIONS.MESSAGES_SEND,
    PERMISSIONS.CALLS_READ,
    PERMISSIONS.CALLS_CREATE,
    PERMISSIONS.WEBSITE_READ,
    PERMISSIONS.WEBSITE_UPDATE,
  ],
  WORKER: [
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_UPDATE,
    PERMISSIONS.TASKS_READ,
    PERMISSIONS.TASKS_UPDATE,
    PERMISSIONS.MESSAGES_READ,
    PERMISSIONS.MESSAGES_SEND,
    PERMISSIONS.CALLS_READ,
  ],
};
