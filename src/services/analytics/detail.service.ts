import dayjs from "dayjs";
import type { ClientStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { analyticsService } from "@/services/analytics/analytics.service";
import { PROVINCE_GROUPS } from "@/lib/provinces";
import { isPlaceholderPhone } from "@/lib/clients/matching";
import {
  METRICS, PAGE_SIZE,
  type Cell, type Column, type DetailRow, type MetricDetail, type MetricKey, type SummaryItem, type Tone,
} from "@/lib/analytics/metrics";

// The tables behind the dashboard figures. Each builder filters exactly like the figure it
// explains (see AnalyticsService.getDashboardOverview), so the rows add up to the number
// that was clicked.

type Part = Pick<MetricDetail, "summary" | "columns" | "rows"> & Partial<Pick<MetricDetail, "total">>;
type Builder = (q: string, page: number) => Promise<Part>;
type Labeled = Record<string, { label: string; tone: Tone }>;

const CLIENT_STATUS: Labeled = {
  ACTIVE: { label: "Faol", tone: "green" },
  INACTIVE: { label: "Nofaol", tone: "slate" },
  LOST: { label: "Yo'qotilgan", tone: "red" },
  DEBTOR: { label: "Qarzdor", tone: "amber" },
  PROSPECT: { label: "Potensial", tone: "indigo" },
  COMPETITOR: { label: "Raqobatchi", tone: "slate" },
  RISK: { label: "Xavfli", tone: "red" },
};
const INVOICE_STATUS: Labeled = {
  DRAFT: { label: "Qoralama", tone: "slate" },
  SENT: { label: "Yuborilgan", tone: "indigo" },
  PAID: { label: "To'langan", tone: "green" },
  PARTIAL: { label: "Qisman", tone: "amber" },
  OVERDUE: { label: "Muddati o'tgan", tone: "red" },
  CANCELLED: { label: "Bekor qilingan", tone: "slate" },
};
const DEBT_STATUS: Labeled = {
  PENDING: { label: "Kutilmoqda", tone: "indigo" },
  PARTIAL: { label: "Qisman to'langan", tone: "amber" },
  OVERDUE: { label: "Muddati o'tgan", tone: "red" },
  PAID: { label: "To'langan", tone: "green" },
  WRITTEN_OFF: { label: "Hisobdan chiqarilgan", tone: "slate" },
};
const TASK_STATUS: Labeled = {
  TODO: { label: "Kutmoqda", tone: "slate" },
  IN_PROGRESS: { label: "Jarayonda", tone: "indigo" },
  REVIEW: { label: "Tekshiruvda", tone: "amber" },
  DONE: { label: "Bajarilgan", tone: "green" },
};
const TASK_PRIORITY: Labeled = {
  LOW: { label: "Past", tone: "slate" },
  MEDIUM: { label: "O'rtacha", tone: "indigo" },
  HIGH: { label: "Yuqori", tone: "amber" },
  URGENT: { label: "Shoshilinch", tone: "red" },
};

const badge = (map: Labeled, key: string): Cell => map[key] ?? { label: key, tone: "slate" };
const provinceLabel = (key: string | null) => (key ? PROVINCE_GROUPS.find((p) => p.key === key)?.label ?? key : null);
const skip = (page: number) => (page - 1) * PAGE_SIZE;
const contains = (q: string) => ({ contains: q, mode: "insensitive" as const });
const iso = (d: Date | null) => d?.toISOString() ?? null;
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

// ── Clients ───────────────────────────────────────────────────────────────────

const CLIENT_COLUMNS: Column[] = [
  { key: "name", label: "Mijoz", type: "text", primary: true },
  { key: "phone", label: "Telefon", type: "text" },
  { key: "status", label: "Holat", type: "badge" },
  { key: "province", label: "Viloyat", type: "text" },
  { key: "lastActivity", label: "Oxirgi faollik", type: "date" },
];

function clients(status?: ClientStatus): Builder {
  return async (q, page) => {
    const where: Prisma.ClientWhereInput = {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ name: contains(q) }, { company: contains(q) }, { phone: { contains: q } }, { inn: { contains: q } }] } : {}),
    };
    const [list, total, groups] = await Promise.all([
      db.client.findMany({
        where,
        orderBy: [{ lastActivity: { sort: "desc", nulls: "last" } }, { name: "asc" }],
        skip: skip(page), take: PAGE_SIZE,
        select: { id: true, name: true, phone: true, status: true, province: true, lastActivity: true },
      }),
      db.client.count({ where }),
      db.client.groupBy({ by: ["status"], _count: true }),
    ]);

    const by = Object.fromEntries(groups.map((g) => [g.status, g._count])) as Partial<Record<ClientStatus, number>>;
    const all = groups.reduce((s, g) => s + g._count, 0);
    const summary: SummaryItem[] = !status
      ? [
          { label: "Jami mijozlar", value: all, kind: "count" },
          { label: "Faol", value: by.ACTIVE ?? 0, kind: "count" },
          { label: "Qarzdor", value: by.DEBTOR ?? 0, kind: "count" },
          { label: "Potensial", value: by.PROSPECT ?? 0, kind: "count" },
          { label: "Yo'qotilgan", value: by.LOST ?? 0, kind: "count" },
        ]
      : [
          { label: CLIENT_STATUS[status].label, value: by[status] ?? 0, kind: "count" },
          { label: "Jami mijozlarga nisbati", value: pct(by[status] ?? 0, all), kind: "percent" },
        ];

    const rows: DetailRow[] = list.map((c) => ({
      id: c.id,
      href: `/crm/clients/${c.id}`,
      cells: {
        name: c.name,
        phone: isPlaceholderPhone(c.phone) ? null : c.phone,
        status: badge(CLIENT_STATUS, c.status),
        province: provinceLabel(c.province),
        lastActivity: iso(c.lastActivity),
      },
    }));
    return { summary, columns: CLIENT_COLUMNS, rows, total };
  };
}

// ── Sales and payments ────────────────────────────────────────────────────────

const INVOICE_COLUMNS: Column[] = [
  { key: "number", label: "Faktura", type: "text", primary: true },
  { key: "client", label: "Mijoz", type: "text" },
  { key: "date", label: "Sana", type: "date" },
  { key: "total", label: "Summa", type: "money" },
  { key: "paid", label: "To'langan", type: "money" },
  { key: "status", label: "Holat", type: "badge" },
];

function invoices(from: () => Date, mode: "sales" | "payments"): Builder {
  return async (q, page) => {
    const base: Prisma.InvoiceWhereInput = {
      createdAt: { gte: from() },
      status: { not: "CANCELLED" },
      ...(mode === "payments" ? { paid: { gt: 0 } } : {}),
    };
    const where: Prisma.InvoiceWhereInput = q
      ? { ...base, OR: [{ number: contains(q) }, { client: { name: contains(q) } }] }
      : base;
    const [list, total, agg] = await Promise.all([
      db.invoice.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { number: "desc" }],
        skip: skip(page), take: PAGE_SIZE,
        select: { id: true, number: true, createdAt: true, total: true, paid: true, status: true, client: { select: { id: true, name: true } } },
      }),
      db.invoice.count({ where }),
      db.invoice.aggregate({ where: base, _sum: { total: true, paid: true }, _count: true }),
    ]);

    const sum = Number(agg._sum.total ?? 0);
    const paid = Number(agg._sum.paid ?? 0);
    const summary: SummaryItem[] = mode === "sales"
      ? [
          { label: "Savdo summasi", value: sum, kind: "money" },
          { label: "Fakturalar soni", value: agg._count, kind: "count" },
          { label: "To'langan", value: paid, kind: "money" },
          { label: "To'lanmagan", value: Math.max(0, sum - paid), kind: "money" },
        ]
      : [
          { label: "To'langan summa", value: paid, kind: "money" },
          { label: "To'lov bor fakturalar", value: agg._count, kind: "count" },
          { label: "Shu fakturalar summasi", value: sum, kind: "money" },
        ];

    const rows: DetailRow[] = list.map((i) => ({
      id: i.id,
      href: `/sales/invoices/${i.id}`,
      cells: {
        number: i.number,
        client: i.client.name,
        date: iso(i.createdAt),
        total: Number(i.total),
        paid: Number(i.paid),
        status: badge(INVOICE_STATUS, i.status),
      },
    }));
    return { summary, columns: INVOICE_COLUMNS, rows, total };
  };
}

// ── Debts ─────────────────────────────────────────────────────────────────────

const OVERDUE_COLUMNS: Column[] = [
  { key: "client", label: "Mijoz", type: "text", primary: true },
  { key: "province", label: "Viloyat", type: "text" },
  { key: "amount", label: "Jami qarz", type: "money" },
  { key: "d31", label: "31–60 kun", type: "money" },
  { key: "d61", label: "61–90 kun", type: "money" },
  { key: "d91", label: "91–100 kun", type: "money" },
  { key: "d100", label: "100+ kun", type: "money" },
  { key: "late", label: "Muddati o'tgan", type: "money" },
];

/** Overdue part per client: the 1C aging buckets older than 30 days (see getDebtStats). */
const overdueDebt: Builder = async (q, page) => {
  const like = `%${q}%`;
  const [list, stats] = await Promise.all([
    db.$queryRaw<{
      id: string; clientId: string; client: string; province: string | null; amount: number;
      d31: number; d61: number; d91: number; d100: number; late: number; total: number;
    }[]>`
      WITH d AS (
        SELECT id, "clientId", amount, status, "syncSource",
          COALESCE("days31to60", 0) AS d31, COALESCE("days61to90", 0) AS d61,
          COALESCE("days91to100", 0) AS d91, COALESCE("daysOver100", 0) AS d100,
          CASE WHEN "syncSource" = '1c'
            THEN COALESCE("days31to60", 0) + COALESCE("days61to90", 0) + COALESCE("days91to100", 0) + COALESCE("daysOver100", 0)
            ELSE amount - "paidAmount"
          END AS late
        FROM debts
        WHERE status IN ('OVERDUE', 'PARTIAL', 'PENDING')
          AND ("syncSource" = '1c' OR status = 'OVERDUE')
      )
      SELECT d.id, d."clientId", c.name AS client, c.province, d.amount::float8 AS amount,
             d.d31::float8 AS d31, d.d61::float8 AS d61, d.d91::float8 AS d91, d.d100::float8 AS d100,
             d.late::float8 AS late, COUNT(*) OVER()::int AS total
      FROM d JOIN clients c ON c.id = d."clientId"
      WHERE d.late > 0 AND c.name ILIKE ${like}
      ORDER BY d.late DESC, c.name
      LIMIT ${PAGE_SIZE} OFFSET ${skip(page)}
    `,
    analyticsService.getDebtStats(),
  ]);

  return {
    summary: [
      { label: "Muddati o'tgan qarz", value: stats.overdue.amount, kind: "money" },
      { label: "Qarzdor mijozlar", value: stats.overdue.count, kind: "count" },
      { label: "Jami qarzning ulushi", value: pct(stats.overdue.amount, stats.totalDebt), kind: "percent" },
    ],
    columns: OVERDUE_COLUMNS,
    rows: list.map((r) => ({
      id: r.id,
      href: `/crm/clients/${r.clientId}`,
      cells: {
        client: r.client, province: provinceLabel(r.province), amount: r.amount,
        d31: r.d31, d61: r.d61, d91: r.d91, d100: r.d100, late: r.late,
      },
    })),
    total: list[0]?.total ?? 0,
  };
};

const OPEN_DEBT = ["PENDING", "PARTIAL", "OVERDUE"] as const;

const totalDebt: Builder = async (q, page) => {
  const where: Prisma.DebtWhereInput = {
    status: { in: [...OPEN_DEBT] },
    ...(q ? { client: { name: contains(q) } } : {}),
  };
  const [list, total, stats] = await Promise.all([
    db.debt.findMany({
      where,
      orderBy: [{ amount: "desc" }, { id: "asc" }],
      skip: skip(page), take: PAGE_SIZE,
      select: { id: true, amount: true, paidAmount: true, status: true, client: { select: { id: true, name: true, province: true } } },
    }),
    db.debt.count({ where }),
    analyticsService.getDebtStats(),
  ]);

  return {
    summary: [
      { label: "Jami qarz", value: stats.totalDebt, kind: "money" },
      { label: "Ochiq qarzlar soni", value: stats.pending.count + stats.overdue.count + stats.partial.count, kind: "count", hint: "1C'da bitta mijozga bitta qarz" },
      { label: "Shundan muddati o'tgan", value: stats.overdue.amount, kind: "money", hint: `${stats.overdue.count} ta mijoz` },
    ],
    columns: [
      { key: "client", label: "Mijoz", type: "text", primary: true },
      { key: "province", label: "Viloyat", type: "text" },
      { key: "status", label: "Holat", type: "badge" },
      { key: "amount", label: "Qarz summasi", type: "money" },
      { key: "paid", label: "To'langan", type: "money" },
    ],
    rows: list.map((d) => ({
      id: d.id,
      href: `/crm/clients/${d.client.id}`,
      cells: {
        client: d.client.name,
        province: provinceLabel(d.client.province),
        status: badge(DEBT_STATUS, d.status),
        amount: Number(d.amount),
        paid: Number(d.paidAmount),
      },
    })),
    total,
  };
};

const debtRecovery: Builder = async () => {
  const [groups, stats] = await Promise.all([
    db.debt.groupBy({ by: ["status"], _count: true, _sum: { amount: true } }),
    analyticsService.getDebtStats(),
  ]);
  const order = ["PENDING", "PARTIAL", "OVERDUE", "PAID", "WRITTEN_OFF"];
  const sorted = [...groups].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  return {
    summary: [
      { label: "Qaytarish darajasi", value: stats.recoveryRate, kind: "percent" },
      { label: "Qaytarilgan qarz", value: stats.totalRecovered, kind: "money" },
      { label: "Hali ochiq qarz", value: stats.totalDebt, kind: "money" },
    ],
    columns: [
      { key: "status", label: "Holat", type: "badge" },
      { key: "count", label: "Qarzlar soni", type: "number" },
      { key: "amount", label: "Summa", type: "money" },
    ],
    rows: sorted.map((g) => ({
      id: g.status,
      cells: { status: badge(DEBT_STATUS, g.status), count: g._count, amount: Number(g._sum.amount ?? 0) },
    })),
  };
};

// ── Tasks ─────────────────────────────────────────────────────────────────────

const tasks: Builder = async (q, page) => {
  const where: Prisma.TaskWhereInput = {
    status: { in: ["IN_PROGRESS", "TODO"] },
    ...(q ? { title: contains(q) } : {}),
  };
  const [list, total, groups] = await Promise.all([
    db.task.findMany({
      where,
      // enum order is TODO < IN_PROGRESS, so descending lists work in progress first
      orderBy: [{ status: "desc" }, { dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      skip: skip(page), take: PAGE_SIZE,
      select: {
        id: true, title: true, status: true, priority: true, dueDate: true,
        assignedTo: { select: { name: true } }, client: { select: { name: true } },
      },
    }),
    db.task.count({ where }),
    db.task.groupBy({ by: ["status"], _count: true }),
  ]);
  const by = Object.fromEntries(groups.map((g) => [g.status, g._count])) as Record<string, number>;

  return {
    summary: [
      { label: "Jarayonda", value: by.IN_PROGRESS ?? 0, kind: "count" },
      { label: "Kutmoqda", value: by.TODO ?? 0, kind: "count" },
      { label: "Tekshiruvda", value: by.REVIEW ?? 0, kind: "count" },
      { label: "Bajarilgan", value: by.DONE ?? 0, kind: "count" },
    ],
    columns: [
      { key: "title", label: "Vazifa", type: "text", primary: true },
      { key: "status", label: "Holat", type: "badge" },
      { key: "priority", label: "Muhimlik", type: "badge" },
      { key: "assignee", label: "Mas'ul", type: "text" },
      { key: "client", label: "Mijoz", type: "text" },
      { key: "dueDate", label: "Muddat", type: "date" },
    ],
    rows: list.map((t) => ({
      id: t.id,
      href: "/tasks",
      cells: {
        title: t.title,
        status: badge(TASK_STATUS, t.status),
        priority: badge(TASK_PRIORITY, t.priority),
        assignee: t.assignedTo?.name ?? null,
        client: t.client?.name ?? null,
        dueDate: iso(t.dueDate),
      },
    })),
    total,
  };
};

// ── Charts ────────────────────────────────────────────────────────────────────

const salesTrend: Builder = async () => {
  const months = await analyticsService.getSalesSummary("monthly");
  const total = months.reduce((s, m) => s + m.total, 0);
  const best = months.reduce<(typeof months)[number] | null>((b, m) => (!b || m.total > b.total ? m : b), null);
  return {
    summary: [
      { label: "Jami savdo", value: total, kind: "money", hint: `${months.length} oy bo'yicha` },
      { label: "O'rtacha oylik savdo", value: months.length ? Math.round(total / months.length) : 0, kind: "money" },
      { label: "Eng yaxshi oy", value: best?.period ?? "—", kind: "text", hint: best ? `${best.count} ta faktura` : undefined },
    ],
    columns: [
      { key: "period", label: "Oy", type: "text" },
      { key: "count", label: "Fakturalar", type: "number" },
      { key: "total", label: "Savdo", type: "money" },
      { key: "paid", label: "To'langan", type: "money" },
      { key: "overdue", label: "Muddati o'tgan fakt.", type: "number" },
    ],
    rows: [...months].reverse().map((m) => ({
      id: m.period,
      cells: { period: m.period, count: m.count, total: m.total, paid: m.paid, overdue: m.overdue },
    })),
  };
};

const clientStatus: Builder = async () => {
  const groups = await db.client.groupBy({ by: ["status"], _count: true, orderBy: { _count: { status: "desc" } } });
  const all = groups.reduce((s, g) => s + g._count, 0);
  const count = (s: string) => groups.find((g) => g.status === s)?._count ?? 0;
  const linkFor: Record<string, string> = { ACTIVE: "/overview/active-clients", LOST: "/overview/lost-clients" };
  return {
    summary: [
      { label: "Jami mijozlar", value: all, kind: "count" },
      { label: "Saqlanish darajasi", value: pct(count("ACTIVE"), all), kind: "percent", hint: "faol mijozlar ulushi" },
      { label: "Yo'qotish darajasi", value: pct(count("LOST"), all), kind: "percent" },
    ],
    columns: [
      { key: "status", label: "Holat", type: "badge", primary: true },
      { key: "count", label: "Mijozlar soni", type: "number" },
      { key: "share", label: "Ulushi, %", type: "number" },
    ],
    rows: groups.map((g) => ({
      id: g.status,
      href: linkFor[g.status],
      cells: { status: badge(CLIENT_STATUS, g.status), count: g._count, share: pct(g._count, all) },
    })),
  };
};

// ── Entry point ───────────────────────────────────────────────────────────────

const BUILDERS: Record<MetricKey, Builder> = {
  clients: clients(),
  "active-clients": clients("ACTIVE"),
  "lost-clients": clients("LOST"),
  "today-sales": invoices(() => dayjs().startOf("day").toDate(), "sales"),
  "monthly-sales": invoices(() => dayjs().startOf("month").toDate(), "sales"),
  "today-payments": invoices(() => dayjs().startOf("day").toDate(), "payments"),
  "overdue-debt": overdueDebt,
  "total-debt": totalDebt,
  "debt-recovery": debtRecovery,
  tasks,
  "sales-trend": salesTrend,
  "client-status": clientStatus,
};

export async function getMetricDetail(metric: MetricKey, opts: { q?: string; page?: number } = {}): Promise<MetricDetail> {
  const q = (opts.q ?? "").trim().slice(0, 100);
  const page = opts.page ?? 1;
  const part = await BUILDERS[metric](METRICS[metric].searchable ? q : "", page);
  return {
    metric,
    title: METRICS[metric].title,
    description: METRICS[metric].description,
    searchable: METRICS[metric].searchable,
    page,
    pageSize: PAGE_SIZE,
    total: part.rows.length,
    ...part,
  };
}
