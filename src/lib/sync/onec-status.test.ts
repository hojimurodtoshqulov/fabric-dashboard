import { describe, expect, it } from "vitest";
import { CHANGE_LABELS, formatAgo, freshness, sameAmount } from "./onec-status";

const NOW = Date.UTC(2026, 9, 27, 12, 0, 0);
const ago = (ms: number) => new Date(NOW - ms);
const H = 3_600_000;

describe("freshness", () => {
  it("is fresh within 8 hours, late within 26, stale after that", () => {
    expect(freshness(ago(5 * 60_000), NOW)).toBe("fresh");
    expect(freshness(ago(8 * H), NOW)).toBe("fresh");
    expect(freshness(ago(8 * H + 1), NOW)).toBe("late");
    expect(freshness(ago(26 * H), NOW)).toBe("late");
    expect(freshness(ago(26 * H + 1), NOW)).toBe("stale");
  });
  it("accepts ISO strings and reports never for no sync", () => {
    expect(freshness(ago(H).toISOString(), NOW)).toBe("fresh");
    expect(freshness(null, NOW)).toBe("never");
    expect(freshness(undefined, NOW)).toBe("never");
  });
});

describe("formatAgo", () => {
  it("counts minutes, hours and days in Uzbek", () => {
    expect(formatAgo(ago(20_000), NOW)).toBe("hozirgina");
    expect(formatAgo(ago(5 * 60_000), NOW)).toBe("5 daqiqa oldin");
    expect(formatAgo(ago(3 * H + 10 * 60_000), NOW)).toBe("3 soat oldin");
    expect(formatAgo(ago(49 * H), NOW)).toBe("2 kun oldin");
  });
  it("shows a dash when there is no date and never goes negative", () => {
    expect(formatAgo(null, NOW)).toBe("—");
    expect(formatAgo(new Date(NOW + 60_000), NOW)).toBe("hozirgina");
  });
});

describe("sameAmount", () => {
  it("ignores differences below a tiyin", () => {
    expect(sameAmount(100, 100.004)).toBe(true);
    expect(sameAmount(100, 100.01)).toBe(false);
    expect(sameAmount(0, 0)).toBe(true);
  });
});

describe("CHANGE_LABELS", () => {
  it("has a label for every kind", () => {
    expect(Object.keys(CHANGE_LABELS).sort()).toEqual([
      "CASH_CHANGED", "CASH_NEW", "CASH_REMOVED", "CLIENT_NEW",
      "DEBT_CHANGED", "DEBT_CLOSED", "DEBT_NEW", "SALE_CHANGED", "SALE_NEW",
    ]);
  });
});
