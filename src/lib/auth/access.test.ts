import { describe, expect, it } from "vitest";
import { ROLE_PERMISSIONS } from "@/constants";
import { canOpen, homeFor, missingPermission, permissionsFor } from "./access";

describe("access rules", () => {
  it("keeps profit and cash flow owner-only", () => {
    const withProfit = Object.entries(ROLE_PERMISSIONS)
      .filter(([, perms]) => perms.includes("finance:profit"))
      .map(([role]) => role);
    for (const path of ["/finance/profit", "/finance/cashflow", "/api/finance/profit", "/api/finance/cashflow"]) {
      for (const role of Object.keys(ROLE_PERMISSIONS)) {
        expect(canOpen(role, path)).toBe(withProfit.includes(role));
      }
    }
    expect(withProfit.length).toBeGreaterThan(0);
  });

  it("lets the longest matching prefix win", () => {
    // /finance needs expenses:read, /finance/cashflow needs finance:profit
    const onlyExpenses = Object.entries(ROLE_PERMISSIONS)
      .find(([, p]) => p.includes("expenses:read") && !p.includes("finance:profit"));
    if (onlyExpenses) {
      expect(canOpen(onlyExpenses[0], "/finance")).toBe(true);
      expect(canOpen(onlyExpenses[0], "/finance/cashflow")).toBe(false);
    }
  });

  it("denies unknown roles everything that has a rule", () => {
    expect(permissionsFor("NOBODY")).toEqual([]);
    expect(permissionsFor(undefined)).toEqual([]);
    expect(missingPermission("NOBODY", "/crm/clients")).toBe("clients:read");
  });

  it("does not block paths without a rule", () => {
    expect(missingPermission("NOBODY", "/login")).toBeNull();
  });

  it("sends every role to a page it can open", () => {
    for (const role of Object.keys(ROLE_PERMISSIONS)) {
      const home = homeFor(role);
      expect(home === "/notifications" || canOpen(role, home)).toBe(true);
    }
  });
});
