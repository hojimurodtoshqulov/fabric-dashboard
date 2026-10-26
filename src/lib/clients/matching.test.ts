import { describe, expect, it } from "vitest";
import {
  MatchIndex, isPlaceholderPhone, nameSimilarity, normalizeName, phoneKey, pickAutoMerge,
  type MatchResult, type MatchTarget,
} from "./matching";

const target = (over: Partial<MatchTarget> & { id: string }): MatchTarget => ({
  name: "X", phone: "", ...over,
});
const match = (t: MatchTarget, score: number, reason: MatchResult["reason"]): MatchResult => ({ target: t, score, reason });

describe("normalizeName", () => {
  it("drops legal forms, brackets and punctuation", () => {
    expect(normalizeName("ООО Таргет фарм (сет) (%)")).toBe("таргет фарм");
  });
  it("transliterates Latin to the same form as Cyrillic", () => {
    expect(normalizeName("Target Farm")).toBe("таргет фарм");
  });
  it("copes with empty input", () => {
    expect(normalizeName("")).toBe("");
  });
});

describe("nameSimilarity", () => {
  it("is 1 for equal names and 0 when one is empty", () => {
    expect(nameSimilarity("таргет фарм", "таргет фарм")).toBe(1);
    expect(nameSimilarity("", "таргет")).toBe(0);
  });
  it("is low for unrelated names", () => {
    expect(nameSimilarity("таргет фарм", "ибн сино")).toBeLessThan(0.3);
  });
});

describe("phones", () => {
  it("recognises the placeholder numbers the sync invents", () => {
    expect(isPlaceholderPhone("+998000123456")).toBe(true);
    expect(isPlaceholderPhone("NOPHONE_1")).toBe(true);
    expect(isPlaceholderPhone(null)).toBe(true);
    expect(isPlaceholderPhone("+998901234567")).toBe(false);
  });
  it("keys a real phone by its last 9 digits", () => {
    expect(phoneKey("+998901234567")).toBe("901234567");
    expect(phoneKey("90 123 45 67")).toBe("901234567");
  });
  it("gives no key for placeholders or short numbers", () => {
    expect(phoneKey("+998000123456")).toBeNull();
    expect(phoneKey("12345")).toBeNull();
    expect(phoneKey(undefined)).toBeNull();
  });
});

describe("MatchIndex", () => {
  const index = () => new MatchIndex([
    target({ id: "1", name: "Таргет фарм", phone: "+998901111111" }),
    target({ id: "2", name: "Ибн Сино", phone: "+998902222222", inn: "123456789" }),
  ]);

  it("finds a business by name across scripts", () => {
    const [m] = index().find({ name: "Target Farm" });
    expect(m.target.id).toBe("1");
    expect(m.reason).toBe("name");
    expect(m.score).toBe(1);
  });
  it("finds by phone however it is written", () => {
    const [m] = index().find({ name: "zzz", phone: "90 111 11 11" });
    expect(m.target.id).toBe("1");
    expect(m.reason).toBe("phone");
  });
  it("finds by INN", () => {
    const [m] = index().find({ name: "zzz", inn: "123456789" });
    expect(m.target.id).toBe("2");
    expect(m.reason).toBe("inn");
  });
  it("finds nothing for an unrelated client", () => {
    expect(index().find({ name: "Совсем другой", phone: "+998903333333" })).toEqual([]);
  });
  it("forgets removed targets", () => {
    const idx = index();
    idx.remove("1");
    expect(idx.find({ name: "Таргет фарм", phone: "+998901111111" })).toEqual([]);
  });
});

describe("pickAutoMerge", () => {
  const a = target({ id: "a", province: "toshkent" });
  const b = target({ id: "b", province: "samarqand" });

  it("merges on a single INN/phone match", () => {
    expect(pickAutoMerge([match(a, 1, "phone")])?.target.id).toBe("a");
  });
  it("sends several hard matches to review", () => {
    expect(pickAutoMerge([match(a, 1, "phone"), match(b, 1, "inn")])).toBeNull();
  });
  it("merges a single strong name match", () => {
    expect(pickAutoMerge([match(a, 1, "name")])?.target.id).toBe("a");
  });
  it("sends two same-name candidates to review", () => {
    expect(pickAutoMerge([match(a, 1, "name"), match(b, 0.95, "name")])).toBeNull();
  });
  it("refuses a name match from another province", () => {
    expect(pickAutoMerge([match(a, 1, "name")], "samarqand")).toBeNull();
    expect(pickAutoMerge([match(a, 1, "name")], "toshkent")?.target.id).toBe("a");
  });
  it("leaves weak name matches for a human", () => {
    expect(pickAutoMerge([match(a, 0.8, "name")])).toBeNull();
  });
});
