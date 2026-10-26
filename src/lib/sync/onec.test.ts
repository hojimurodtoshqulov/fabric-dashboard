import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/services/crm/client-merge.service", () => ({
  loadMergeableIndex: vi.fn(),
  loadRejectedPairs: vi.fn(),
}));

import { calculateAging, normalizePhone } from "./onec.service";

const NOW = Date.UTC(2026, 9, 22); // 2026-10-22

describe("calculateAging", () => {
  const invoices = [
    { date: "2026-10-10", number: "A", amount: 100 }, //  12 days
    { date: "2026-08-20", number: "B", amount: 200 }, //  63 days
    { date: "2026-06-01", number: "C", amount: 300 }, // 143 days
  ];

  it("assumes the oldest invoices are the unpaid ones (FIFO)", () => {
    expect(calculateAging(350, invoices, NOW)).toEqual({
      days0to30: 0, days31to60: 0, days61to90: 50, days91to100: 0, daysOver100: 300,
    });
  });

  it("spreads a full balance over every bucket it touches", () => {
    expect(calculateAging(600, invoices, NOW)).toEqual({
      days0to30: 100, days31to60: 0, days61to90: 200, days91to100: 0, daysOver100: 300,
    });
  });

  it("is independent of the order invoices arrive in", () => {
    expect(calculateAging(350, [...invoices].reverse(), NOW)).toEqual(calculateAging(350, invoices, NOW));
  });

  it("puts a balance larger than all invoices into the oldest bucket", () => {
    expect(calculateAging(700, invoices, NOW).daysOver100).toBe(400);
  });

  it("puts a balance with no invoices into the oldest bucket", () => {
    expect(calculateAging(500, [], NOW)).toEqual({
      days0to30: 0, days31to60: 0, days61to90: 0, days91to100: 0, daysOver100: 500,
    });
  });

  it("allocates nothing for a zero balance", () => {
    expect(calculateAging(0, invoices, NOW)).toEqual({
      days0to30: 0, days31to60: 0, days61to90: 0, days91to100: 0, daysOver100: 0,
    });
  });

  it("splits buckets at 30, 60, 90 and 100 days", () => {
    const at = (date: string) => calculateAging(1, [{ date, number: "X", amount: 1 }], NOW);
    expect(at("2026-09-22").days0to30).toBe(1);   //  30 days
    expect(at("2026-09-21").days31to60).toBe(1);  //  31 days
    expect(at("2026-08-23").days31to60).toBe(1);  //  60 days
    expect(at("2026-08-22").days61to90).toBe(1);  //  61 days
    expect(at("2026-07-24").days61to90).toBe(1);  //  90 days
    expect(at("2026-07-23").days91to100).toBe(1); //  91 days
    expect(at("2026-07-14").days91to100).toBe(1); // 100 days
    expect(at("2026-07-13").daysOver100).toBe(1); // 101 days
  });
});

describe("normalizePhone", () => {
  it("adds the country code to a local number", () => {
    expect(normalizePhone("901234567")).toBe("+998901234567");
  });
  it("accepts formatted and international numbers", () => {
    expect(normalizePhone("998901234567")).toBe("+998901234567");
    expect(normalizePhone("+998 90 123-45-67")).toBe("+998901234567");
  });
  it("rejects empty and too-short input", () => {
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("12345")).toBeNull();
  });
});
