import { describe, expect, it } from "vitest";
import { METRICS, PAGE_SIZE, isMetric, metricHref, parsePage } from "./metrics";

describe("isMetric", () => {
  it("accepts every registered metric", () => {
    for (const key of Object.keys(METRICS)) expect(isMetric(key)).toBe(true);
  });
  it("rejects unknown names, including object prototype keys", () => {
    for (const bad of ["", "nope", "constructor", "__proto__", "toString", null, undefined, 5]) {
      expect(isMetric(bad)).toBe(false);
    }
  });
});

describe("metricHref", () => {
  it("points under /overview", () => {
    expect(metricHref("overdue-debt")).toBe("/overview/overdue-debt");
  });
});

describe("METRICS", () => {
  it("has a title and description for each page", () => {
    for (const m of Object.values(METRICS)) {
      expect(m.title.length).toBeGreaterThan(0);
      expect(m.description.length).toBeGreaterThan(0);
    }
  });
  it("covers every figure on the dashboard", () => {
    expect(Object.keys(METRICS).sort()).toEqual([
      "active-clients", "client-status", "clients", "debt-recovery", "lost-clients", "monthly-sales",
      "overdue-debt", "sales-trend", "tasks", "today-payments", "today-sales", "total-debt",
    ]);
  });
});

describe("parsePage", () => {
  it("takes positive whole numbers", () => {
    expect(parsePage("1")).toBe(1);
    expect(parsePage("7")).toBe(7);
  });
  it("falls back to the first page for anything else", () => {
    for (const bad of [null, undefined, "", "0", "-3", "2.5", "abc", "1e9", "999999"]) {
      expect(parsePage(bad)).toBe(1);
    }
  });
  it("uses a sensible page size", () => {
    expect(PAGE_SIZE).toBeGreaterThan(0);
  });
});
