// Pure helpers for the 1C sync status in Settings. No database, safe to import in the browser.

import type { OneCChangeKind } from "@prisma/client";

export type Freshness = "fresh" | "late" | "stale" | "never";

const HOUR = 3_600_000;

/**
 * How recent the last finished sync is. The factory agent runs every few hours, so
 * up to 8 h is normal, up to 26 h is late (one run missed), beyond that it has stopped.
 */
export function freshness(lastAt: Date | string | null | undefined, now = Date.now()): Freshness {
  if (!lastAt) return "never";
  const age = now - new Date(lastAt).getTime();
  if (age <= 8 * HOUR) return "fresh";
  if (age <= 26 * HOUR) return "late";
  return "stale";
}

/** "hozirgina", "5 daqiqa oldin", "3 soat oldin", "2 kun oldin". */
export function formatAgo(at: Date | string | null | undefined, now = Date.now()): string {
  if (!at) return "—";
  const ms = Math.max(0, now - new Date(at).getTime());
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "hozirgina";
  if (min < 60) return `${min} daqiqa oldin`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return `${Math.floor(hours / 24)} kun oldin`;
}

/** Sums are stored with 2 decimals; anything below a tiyin is the same amount. */
export function sameAmount(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005;
}

export const CHANGE_LABELS: Record<OneCChangeKind, string> = {
  SALE_NEW: "Yangi savdo",
  SALE_CHANGED: "Savdo summasi o'zgardi",
  DEBT_NEW: "Yangi qarz",
  DEBT_CHANGED: "Qarz o'zgardi",
  DEBT_CLOSED: "Qarz yopildi",
  CLIENT_NEW: "Yangi mijoz",
  CASH_NEW: "Yangi kassa/bank operatsiyasi",
  CASH_CHANGED: "Kassa/bank summasi o'zgardi",
  CASH_REMOVED: "Kassa/bank yozuvi o'chdi",
};
