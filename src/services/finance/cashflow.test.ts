import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { fillTrend, summarizeGroups, type GroupSum } from "./cashflow.service";

const g = (direction: "IN" | "OUT", channel: "CASH" | "BANK", category: GroupSum["category"], amount: number): GroupSum =>
  ({ direction, channel, category, amount });

describe("summarizeGroups", () => {
  const groups = [
    g("IN", "CASH", "CUSTOMER", 1_000),
    g("IN", "BANK", "CUSTOMER", 4_000),
    g("OUT", "BANK", "SUPPLIER", 2_500),
    g("OUT", "CASH", "PAYROLL", 700),
    g("OUT", "BANK", "PAYROLL", 300),
  ];

  it("totals money in, out and the net", () => {
    const s = summarizeGroups("2026-10", groups);
    expect(s.totalIn).toBe(5_000);
    expect(s.totalOut).toBe(3_500);
    expect(s.net).toBe(1_500);
  });

  it("splits by channel", () => {
    const s = summarizeGroups("2026-10", groups);
    expect(s.byChannel).toEqual([
      { channel: "BANK", in: 4_000, out: 2_800 },
      { channel: "CASH", in: 1_000, out: 700 },
    ]);
  });

  it("merges channels within a category and sorts biggest first", () => {
    const s = summarizeGroups("2026-10", groups);
    expect(s.byCategory).toEqual([
      { direction: "IN", category: "CUSTOMER", amount: 5_000 },
      { direction: "OUT", category: "SUPPLIER", amount: 2_500 },
      { direction: "OUT", category: "PAYROLL", amount: 1_000 },
    ]);
  });

  it("is all zeros for an empty month", () => {
    const s = summarizeGroups("2026-10", []);
    expect(s).toMatchObject({ totalIn: 0, totalOut: 0, net: 0, byChannel: [], byCategory: [], lastSyncedAt: null });
  });

  it("reports when 1C last confirmed a row", () => {
    expect(summarizeGroups("2026-10", [], new Date("2026-10-22T05:00:00Z")).lastSyncedAt).toBe("2026-10-22T05:00:00.000Z");
  });
});

describe("fillTrend", () => {
  it("returns every month oldest first and zero-fills the gaps", () => {
    const t = fillTrend("2026-02", 3, [
      { month: "2026-01", direction: "IN", amount: 500 },
      { month: "2026-01", direction: "OUT", amount: 200 },
      { month: "2026-02", direction: "OUT", amount: 50 },
    ]);
    expect(t).toEqual([
      { month: "2025-12", in: 0, out: 0, net: 0 },
      { month: "2026-01", in: 500, out: 200, net: 300 },
      { month: "2026-02", in: 0, out: 50, net: -50 },
    ]);
  });
});
