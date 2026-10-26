import { describe, expect, it } from "vitest";
import { formatSum, formatSumAxis, formatSumFull, formatSumWords } from "./money";

describe("formatSumFull", () => {
  it("groups thousands with spaces", () => {
    expect(formatSumFull(1_400_000)).toBe("1 400 000");
    expect(formatSumFull(950)).toBe("950");
    expect(formatSumFull(0)).toBe("0");
  });
  it("rounds and keeps the sign", () => {
    expect(formatSumFull(999.6)).toBe("1 000");
    expect(formatSumFull(-1234)).toBe("-1 234");
  });
});

describe("formatSumWords", () => {
  it("shows the two largest units", () => {
    expect(formatSumWords(1_400_000)).toBe("1 mln 400 ming");
    expect(formatSumWords(6_440_612_345)).toBe("6 mlrd 440 mln");
  });
  it("drops the rest when the next unit is empty", () => {
    expect(formatSumWords(1_000_000)).toBe("1 mln");
    expect(formatSumWords(1_000_500)).toBe("1 mln");
  });
  it("keeps the remainder under 1000 after ming", () => {
    expect(formatSumWords(1_500)).toBe("1 ming 500");
  });
  it("prints small numbers as is", () => {
    expect(formatSumWords(950)).toBe("950");
    expect(formatSumWords(0)).toBe("0");
  });
  it("keeps the sign", () => {
    expect(formatSumWords(-1_400_000)).toBe("-1 mln 400 ming");
  });
});

describe("formatSum", () => {
  it("adds the currency in both formats", () => {
    expect(formatSum(1_400_000, "words")).toBe("1 mln 400 ming so'm");
    expect(formatSum(1_400_000, "full")).toBe("1 400 000 so'm");
  });
});

describe("formatSumAxis", () => {
  it("uses a decimal comma", () => {
    expect(formatSumAxis(1_400_000)).toBe("1,4 mln");
    expect(formatSumAxis(1_500)).toBe("1,5 ming");
    expect(formatSumAxis(-2_500_000)).toBe("-2,5 mln");
  });
  it("drops a zero decimal", () => {
    expect(formatSumAxis(2_000_000)).toBe("2 mln");
  });
  it("leaves small numbers alone", () => {
    expect(formatSumAxis(500)).toBe("500");
  });
});
