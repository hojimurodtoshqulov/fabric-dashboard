import { describe, expect, it } from "vitest";
import {
  PAID_DAY_WEIGHT, dateOnly, daysInMonth, defaultWorkingDays, isDateString, isMonth,
  monthLabel, monthOf, monthRange, shiftMonth, todayString,
} from "./shared";

describe("month helpers", () => {
  it("validates month strings", () => {
    expect(isMonth("2026-10")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth("2026-1")).toBe(false);
    expect(isMonth(202610)).toBe(false);
  });

  it("validates date strings", () => {
    expect(isDateString("2026-10-22")).toBe(true);
    expect(isDateString("22.10.2026")).toBe(false);
    expect(isDateString(null)).toBe(false);
  });

  it("formats local dates", () => {
    expect(monthOf(new Date(2026, 9, 5))).toBe("2026-10");
    expect(todayString(new Date(2026, 9, 5))).toBe("2026-10-05");
  });

  it("labels months in Uzbek", () => {
    expect(monthLabel("2026-10")).toBe("Oktyabr 2026");
  });

  it("shifts across year boundaries", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-10", 0)).toBe("2026-10");
    expect(shiftMonth("2026-10", -14)).toBe("2025-08");
  });

  it("gives a half-open UTC range", () => {
    const { start, end } = monthRange("2026-10");
    expect(start.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(monthRange("2026-12").end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("parses date-only strings as UTC midnight", () => {
    expect(dateOnly("2026-10-05").toISOString()).toBe("2026-10-05T00:00:00.000Z");
  });

  it("knows month lengths, leap years included", () => {
    expect(daysInMonth("2026-10")).toBe(31);
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2028-02")).toBe(29);
  });

  it("counts Monday–Saturday as working days", () => {
    // October 2026: 31 days, Sundays on 4, 11, 18, 25
    expect(defaultWorkingDays("2026-10")).toBe(27);
    // February 2026: starts on a Sunday, Sundays on 1, 8, 15, 22
    expect(defaultWorkingDays("2026-02")).toBe(24);
  });
});

describe("PAID_DAY_WEIGHT", () => {
  it("pays full, half and no days", () => {
    expect(PAID_DAY_WEIGHT.PRESENT).toBe(1);
    expect(PAID_DAY_WEIGHT.LATE).toBe(1);
    expect(PAID_DAY_WEIGHT.HALF_DAY).toBe(0.5);
    expect(PAID_DAY_WEIGHT.ABSENT).toBe(0);
    expect(PAID_DAY_WEIGHT.SICK).toBe(0);
    expect(PAID_DAY_WEIGHT.VACATION).toBe(0);
  });
});
