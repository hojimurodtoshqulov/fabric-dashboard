import type { ClientSource, ClientStatus, Prisma } from "@prisma/client";

// Business categories (derived from source, not stored):
//   faol      — exists in 1C (source ONEC). Debtors are faol too.
//   qarzdor   — faol with an open 1C balance (status DEBTOR).
//   potensial — uploaded from Excel or added by hand; to be won over with AI calls / SMS.
//   yangi     — inbound from website, Instagram, Telegram or walk-in.
export type ClientCategory = "faol" | "qarzdor" | "potensial" | "yangi";

export const POTENTIAL_SOURCES: ClientSource[] = ["MANUAL", "IMPORT"];
export const NEW_SOURCES: ClientSource[] = ["WEBSITE", "INSTAGRAM", "TELEGRAM", "WALK_IN"];

/** Sources a user may pick when adding a client by hand (ONEC is set only by the 1C sync). */
export const MANUAL_SOURCE_OPTIONS: { value: ClientSource; label: string }[] = [
  { value: "MANUAL",    label: "Potensial (qo'lda)" },
  { value: "WEBSITE",   label: "Veb-sayt" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TELEGRAM",  label: "Telegram" },
  { value: "WALK_IN",   label: "Jonli murojaat" },
];

export const SOURCE_LABELS: Record<ClientSource, string> = {
  ONEC:      "1C",
  MANUAL:    "Qo'lda",
  IMPORT:    "Excel",
  WEBSITE:   "Veb-sayt",
  INSTAGRAM: "Instagram",
  TELEGRAM:  "Telegram",
  WALK_IN:   "Jonli",
};

export const CATEGORY_LABELS: Record<ClientCategory, string> = {
  faol:      "Faol",
  qarzdor:   "Qarzdor",
  potensial: "Potensial",
  yangi:     "Yangi",
};

export function isCategory(v: unknown): v is ClientCategory {
  return v === "faol" || v === "qarzdor" || v === "potensial" || v === "yangi";
}

export function categoryWhere(category: ClientCategory): Prisma.ClientWhereInput {
  switch (category) {
    case "faol":      return { source: "ONEC" };
    case "qarzdor":   return { source: "ONEC", status: "DEBTOR" };
    case "potensial": return { source: { in: POTENTIAL_SOURCES } };
    case "yangi":     return { source: { in: NEW_SOURCES } };
  }
}

export function clientCategory(source: ClientSource, status: ClientStatus): ClientCategory {
  if (source === "ONEC") return status === "DEBTOR" ? "qarzdor" : "faol";
  return NEW_SOURCES.includes(source) ? "yangi" : "potensial";
}

/** Excludes clients without a dialable number (1C placeholders, import rows without phone). */
export const REACHABLE_PHONE: Prisma.ClientWhereInput = {
  NOT: [{ phone: { startsWith: "+998000" } }, { phone: { startsWith: "NOPHONE_" } }],
};

// Audiences for AI calls / SMS. A 1C client can never fall into potensial or yangi,
// so a regular buyer never gets an "introducing our prices" campaign.
export const CALL_SEGMENTS = ["doimiy", "qarzdor", "potensial", "yangi", "yoqotilgan"] as const;
export type CallSegment = (typeof CALL_SEGMENTS)[number];

export function isCallSegment(v: unknown): v is CallSegment {
  return CALL_SEGMENTS.includes(v as CallSegment);
}

const NOT_OUTREACH: ClientStatus[] = ["LOST", "COMPETITOR"];

// Held back from prospect campaigns until the duplicates page decides — it may be a 1C client.
const NOT_UNDER_REVIEW: Prisma.ClientWhereInput = { matchesAsPotential: { none: { status: "PENDING" } } };

export function callSegmentWhere(segment: CallSegment): Prisma.ClientWhereInput {
  const base: Record<CallSegment, Prisma.ClientWhereInput> = {
    doimiy:     { source: "ONEC", status: { not: "LOST" } },
    qarzdor:    categoryWhere("qarzdor"),
    potensial:  { source: { in: POTENTIAL_SOURCES }, status: { notIn: NOT_OUTREACH }, ...NOT_UNDER_REVIEW },
    yangi:      { source: { in: NEW_SOURCES }, status: { notIn: NOT_OUTREACH }, ...NOT_UNDER_REVIEW },
    yoqotilgan: { status: "LOST" },
  };
  return { AND: [base[segment], REACHABLE_PHONE] };
}
