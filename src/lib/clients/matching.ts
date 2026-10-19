// Matching 1C clients against potential clients (Excel/manual) to find the same business.
// Names come in Cyrillic and Latin, with legal forms, branch notes and region in brackets,
// e.g. "Таргет фарм (сет) (%)" vs "таргет фарм".

const LATIN_TO_CYR: Record<string, string> = {
  a: "а", b: "б", c: "с", d: "д", e: "е", f: "ф", g: "г", h: "х", i: "и", j: "ж", k: "к",
  l: "л", m: "м", n: "н", o: "о", p: "п", q: "к", r: "р", s: "с", t: "т", u: "у", v: "в",
  w: "в", x: "х", y: "й", z: "з",
};

// Legal forms and branch/price notes that say nothing about which business it is.
const STOP_WORDS = new Set([
  "ооо", "мчж", "хк", "ок", "чп", "ип", "ятт", "ххк", "ук", "сет", "филиали", "филиал", "ишл",
]);

export function normalizeName(name: string): string {
  let s = (name || "").toLowerCase()
    .replace(/ё/g, "е").replace(/ғ/g, "г").replace(/қ/g, "к").replace(/ҳ/g, "х").replace(/ў/g, "у")
    .replace(/o['‘ʻ`]/g, "у").replace(/g['‘ʻ`]/g, "г")
    .replace(/sh/g, "ш").replace(/ch/g, "ч")
    .replace(/[a-z]/g, (c) => LATIN_TO_CYR[c] ?? c);
  s = s.replace(/\(.*?\)/g, " ").replace(/[^а-я0-9 ]/g, " ");
  return s.split(/\s+/).filter((w) => w && !STOP_WORDS.has(w)).join(" ");
}

function trigrams(s: string): Set<string> {
  const out = new Set<string>();
  const padded = `  ${s} `;
  for (let i = 0; i < padded.length - 2; i++) out.add(padded.slice(i, i + 3));
  return out;
}

function dice(A: Set<string>, B: Set<string>): number {
  let shared = 0;
  for (const t of A) if (B.has(t)) shared++;
  return (2 * shared) / (A.size + B.size);
}

/** Dice coefficient over character trigrams of normalized names (0..1). */
export function nameSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  return dice(trigrams(a), trigrams(b));
}

/** Phone numbers the 1C sync invents when 1C has no phone: +998000XXXXXXX. */
export function isPlaceholderPhone(phone?: string | null): boolean {
  return !phone || phone.startsWith("+998000") || phone.startsWith("NOPHONE_");
}

/** Last 9 digits of a real phone, or null. */
export function phoneKey(phone?: string | null): string | null {
  if (isPlaceholderPhone(phone)) return null;
  const d = phone!.replace(/\D/g, "");
  if (d.length < 9) return null;
  const key = d.slice(-9);
  return key.startsWith("000") ? null : key;
}

/** Merged without asking: same phone/INN, or names that are identical after normalizing. */
export const AUTO_MERGE_SCORE = 0.93;
/** Shown on the review page for a human to decide. */
export const REVIEW_SCORE = 0.72;

export interface MatchTarget {
  id: string;
  name: string;
  phone: string;
  phone2?: string | null;
  inn?: string | null;
  province?: string | null;
}

export interface MatchResult<T extends MatchTarget = MatchTarget> {
  target: T;
  score: number;
  reason: "inn" | "phone" | "name";
}

export class MatchIndex<T extends MatchTarget = MatchTarget> {
  private items: { target: T; norm: string; tri: Set<string> }[];
  private byPhone = new Map<string, T[]>();
  private byInn = new Map<string, T[]>();

  constructor(targets: T[]) {
    this.items = targets.map((target) => {
      const norm = normalizeName(target.name);
      return { target, norm, tri: trigrams(norm) };
    });
    for (const t of targets) {
      for (const pk of new Set([phoneKey(t.phone), phoneKey(t.phone2)])) {
        if (pk) push(this.byPhone, pk, t);
      }
      if (t.inn) push(this.byInn, t.inn, t);
    }
  }

  remove(id: string) {
    this.items = this.items.filter((i) => i.target.id !== id);
    for (const m of [this.byPhone, this.byInn]) {
      for (const [k, v] of m) {
        const rest = v.filter((t) => t.id !== id);
        if (rest.length) m.set(k, rest); else m.delete(k);
      }
    }
  }

  /** All candidates scoring at least REVIEW_SCORE, best first. */
  find(q: { name: string; phone?: string | null; inn?: string | null }): MatchResult<T>[] {
    const found = new Map<string, MatchResult<T>>();
    if (q.inn) for (const t of this.byInn.get(q.inn) ?? []) found.set(t.id, { target: t, score: 1, reason: "inn" });
    const pk = phoneKey(q.phone);
    if (pk) for (const t of this.byPhone.get(pk) ?? []) if (!found.has(t.id)) found.set(t.id, { target: t, score: 1, reason: "phone" });

    const norm = normalizeName(q.name);
    if (norm) {
      const tri = trigrams(norm);
      for (const i of this.items) {
        if (!i.norm || found.has(i.target.id)) continue;
        const score = i.norm === norm ? 1 : dice(tri, i.tri);
        if (score >= REVIEW_SCORE) found.set(i.target.id, { target: i.target, score, reason: "name" });
      }
    }
    return [...found.values()].sort((a, b) => b.score - a.score);
  }
}

function push<K, V>(m: Map<K, V[]>, k: K, v: V) {
  const arr = m.get(k);
  if (arr) arr.push(v); else m.set(k, [v]);
}

/**
 * The one candidate that is safe to merge without a human, if any.
 * INN/phone matches are always safe. A name match is safe only when it is the single
 * strong candidate — two "Ибн сино" pharmacies in different regions go to review.
 */
export function pickAutoMerge<T extends MatchTarget>(
  matches: MatchResult<T>[],
  province?: string | null,
): MatchResult<T> | null {
  const hard = matches.filter((m) => m.reason !== "name");
  if (hard.length === 1) return hard[0];
  if (hard.length > 1) return null;

  const strong = matches.filter((m) => m.score >= AUTO_MERGE_SCORE);
  if (strong.length !== 1) return null;
  const m = strong[0];
  if (province && m.target.province && province !== m.target.province) return null;
  return m;
}
