// The figures on the dashboard (Bosh sahifa) and the pages behind them. Free of server-only
// imports: the dashboard cards, the detail page and the API all share this list.

export const METRICS = {
  clients: {
    title: "Jami mijozlar",
    description: "Bazadagi barcha mijozlar — faol, qarzdor, potensial va boshqalar",
    searchable: true,
  },
  "active-clients": {
    title: "Faol mijozlar",
    description: "Holati «Faol» bo'lgan mijozlar",
    searchable: true,
  },
  "lost-clients": {
    title: "Yo'qotilgan mijozlar",
    description: "Holati «Yo'qotilgan» bo'lgan mijozlar",
    searchable: true,
  },
  "today-sales": {
    title: "Bugungi savdo",
    description: "Bugun yozilgan hisob-fakturalar (bekor qilinganlarsiz)",
    searchable: true,
  },
  "monthly-sales": {
    title: "Oylik savdo",
    description: "Shu oyda yozilgan hisob-fakturalar (bekor qilinganlarsiz)",
    searchable: true,
  },
  "today-payments": {
    title: "Bugungi to'lovlar",
    description: "Bugun yozilgan fakturalar bo'yicha to'langan summa",
    searchable: true,
  },
  "overdue-debt": {
    title: "Muddati o'tgan qarz",
    description: "30 kundan oshgan qismi, mijozlar kesimida",
    searchable: true,
  },
  "total-debt": {
    title: "Jami qarz",
    description: "Barcha to'lanmagan qarzlar (muddati o'tgan va o'tmagan)",
    searchable: true,
  },
  "debt-recovery": {
    title: "Qarz qaytarish",
    description: "Qarzlar holat bo'yicha: qancha qaytarilgan, qancha ochiq",
    searchable: false,
  },
  tasks: {
    title: "Faol vazifalar",
    description: "Jarayondagi va kutayotgan vazifalar",
    searchable: true,
  },
  "sales-trend": {
    title: "Oylik savdo dinamikasi",
    description: "So'nggi 12 oy bo'yicha savdo va to'lovlar",
    searchable: false,
  },
  "client-status": {
    title: "Mijozlar holati",
    description: "Mijozlar holatlar bo'yicha, saqlanish va yo'qotish darajasi",
    searchable: false,
  },
} as const;

export type MetricKey = keyof typeof METRICS;

export function isMetric(v: unknown): v is MetricKey {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(METRICS, v);
}

export const metricHref = (key: MetricKey) => `/overview/${key}`;

// ── Shape of a detail page ────────────────────────────────────────────────────

export type Tone = "green" | "red" | "amber" | "indigo" | "slate";
export type Cell = string | number | null | { label: string; tone: Tone };

export interface Column {
  key: string;
  label: string;
  type: "text" | "money" | "date" | "number" | "badge";
  /** The cell that carries the row link. */
  primary?: boolean;
}

export interface SummaryItem {
  label: string;
  value: number | string;
  kind: "money" | "count" | "percent" | "text";
  hint?: string;
}

export interface DetailRow {
  id: string;
  /** Where clicking the row's primary cell goes. */
  href?: string;
  cells: Record<string, Cell>;
}

export interface MetricDetail {
  metric: MetricKey;
  title: string;
  description: string;
  summary: SummaryItem[];
  columns: Column[];
  rows: DetailRow[];
  total: number;
  page: number;
  pageSize: number;
  searchable: boolean;
}

export const PAGE_SIZE = 25;

/** Page numbers come from the URL: anything that is not a positive whole number is page 1. */
export function parsePage(v: string | null | undefined): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 100_000 ? n : 1;
}
