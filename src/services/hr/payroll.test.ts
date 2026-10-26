import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { payAmounts } from "./payroll.service";

const base = {
  payType: "MONTHLY" as const, baseSalary: 0, dailyRate: 0, workedDays: 0, workingDays: 26,
  piece: 0, bonus: 0, penalty: 0, advance: 0,
};

describe("payAmounts", () => {
  it("pays a monthly salary pro rata to worked days", () => {
    const r = payAmounts({ ...base, baseSalary: 3_000_000, workedDays: 13 });
    expect(r.baseAmount).toBe(1_500_000);
    expect(r.total).toBe(1_500_000);
  });

  it("never pays more than the full monthly salary", () => {
    expect(payAmounts({ ...base, baseSalary: 3_000_000, workedDays: 30 }).baseAmount).toBe(3_000_000);
  });

  it("pays nothing when the month has no working days", () => {
    expect(payAmounts({ ...base, baseSalary: 3_000_000, workedDays: 5, workingDays: 0 }).baseAmount).toBe(0);
  });

  it("rounds to whole sums", () => {
    expect(payAmounts({ ...base, baseSalary: 1_000_000, workedDays: 10 }).baseAmount).toBe(384_615);
  });

  it("pays daily workers rate × days, half days included", () => {
    const r = payAmounts({ ...base, payType: "DAILY", dailyRate: 100_000, workedDays: 20.5 });
    expect(r.baseAmount).toBe(2_050_000);
  });

  it("pays piece workers piecework only", () => {
    const r = payAmounts({ ...base, payType: "PIECE", baseSalary: 5_000_000, dailyRate: 100_000, workedDays: 26, piece: 750_000.4 });
    expect(r.baseAmount).toBe(0);
    expect(r.pieceAmount).toBe(750_000);
    expect(r.total).toBe(750_000);
  });

  it("adds piecework and bonus, subtracts penalty and advance", () => {
    const r = payAmounts({
      ...base, baseSalary: 3_000_000, workedDays: 13,
      piece: 100_000, bonus: 50_000, penalty: 20_000, advance: 200_000,
    });
    expect(r.total).toBe(1_430_000);
  });

  it("can go negative when advances exceed the earnings", () => {
    expect(payAmounts({ ...base, payType: "DAILY", dailyRate: 100_000, workedDays: 1, advance: 300_000 }).total).toBe(-200_000);
  });
});
