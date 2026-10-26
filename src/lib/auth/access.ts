// Which permission each page and API area needs. Used by the middleware (edge — keep this
// file free of server-only imports) and by the sidebar, so the menu only shows what opens.
import { ROLE_PERMISSIONS, type Permission, type RoleName } from "@/constants";

interface AccessRule {
  prefix: string;
  /** GET / page view */
  read: Permission;
  /** POST, PATCH, PUT, DELETE. Omitted → handlers check their own permissions. */
  write?: Permission;
}

// Longest matching prefix wins, so "/finance/profit" overrides "/finance".
const RULES: AccessRule[] = [
  { prefix: "/overview",       read: "analytics:read" },
  { prefix: "/crm",            read: "clients:read" },
  { prefix: "/budget-orgs",    read: "clients:read", write: "clients:update" },
  { prefix: "/sales",          read: "sales:read" },
  { prefix: "/warehouse",      read: "warehouse:read", write: "warehouse:update" },
  { prefix: "/hr",             read: "employees:read" },
  { prefix: "/hr/payroll",     read: "payroll:read" },
  { prefix: "/finance",        read: "expenses:read" },
  { prefix: "/finance/profit", read: "finance:profit" },
  { prefix: "/finance/cashflow", read: "finance:profit" },
  { prefix: "/ai-calls",       read: "calls:read" },
  { prefix: "/messages",       read: "messages:read" },
  { prefix: "/analytics",      read: "analytics:read" },
  { prefix: "/marketing",      read: "marketing:read" },
  { prefix: "/website",        read: "website:read" },
  { prefix: "/tasks",          read: "tasks:read" },
  { prefix: "/settings",       read: "settings:read" },

  { prefix: "/api/clients",    read: "clients:read" },
  { prefix: "/api/budget-orgs", read: "clients:read", write: "clients:update" },
  { prefix: "/api/invoices",   read: "sales:read" },
  { prefix: "/api/payments",   read: "sales:read" },
  { prefix: "/api/debts",      read: "sales:read" },
  { prefix: "/api/warehouse",  read: "warehouse:read", write: "warehouse:update" },
  { prefix: "/api/hr",         read: "employees:read" },
  { prefix: "/api/finance",    read: "expenses:read" },
  { prefix: "/api/finance/profit", read: "finance:profit" },
  { prefix: "/api/finance/cashflow", read: "finance:profit" },
  { prefix: "/api/calls",      read: "calls:read" },
  { prefix: "/api/messages",   read: "messages:read" },
  { prefix: "/api/analytics",  read: "analytics:read" },
  { prefix: "/api/marketing",  read: "marketing:read" },
  { prefix: "/api/website",    read: "website:read" },
  { prefix: "/api/tasks",      read: "tasks:read" },
  { prefix: "/api/settings",   read: "settings:read" },
  { prefix: "/api/users",      read: "users:read" },
];

function matchRule(pathname: string): AccessRule | undefined {
  let best: AccessRule | undefined;
  for (const r of RULES) {
    if ((pathname === r.prefix || pathname.startsWith(r.prefix + "/")) &&
        (!best || r.prefix.length > best.prefix.length)) {
      best = r;
    }
  }
  return best;
}

export function permissionsFor(role: string | undefined): Permission[] {
  return ROLE_PERMISSIONS[role as RoleName] ?? [];
}

/** null = allowed; otherwise the missing permission. */
export function missingPermission(role: string | undefined, pathname: string, method = "GET"): Permission | null {
  const rule = matchRule(pathname);
  if (!rule) return null;
  const needed = method === "GET" || method === "HEAD" ? rule.read : (rule.write ?? rule.read);
  return permissionsFor(role).includes(needed) ? null : needed;
}

export function canOpen(role: string | undefined, pathname: string): boolean {
  return missingPermission(role, pathname) === null;
}

// The first page a role can open is its landing page (foreman → Xodimlar, not Omborxona).
export const NAV_PAGES = [
  "/overview", "/crm/clients", "/budget-orgs", "/sales/invoices", "/sales/debts",
  "/hr", "/warehouse", "/hr/payroll", "/finance", "/finance/profit", "/finance/cashflow", "/ai-calls",
  "/messages", "/analytics", "/marketing", "/website", "/tasks", "/notifications", "/settings",
] as const;

export function homeFor(role: string | undefined): string {
  return NAV_PAGES.find((p) => canOpen(role, p)) ?? "/notifications";
}
