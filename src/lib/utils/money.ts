// Money display for UZS. Two styles the user can switch between:
//   words — "1 mln 400 ming so'm"   (the two largest units, rest dropped)
//   full  — "1 400 000 so'm"

export type MoneyFormat = "words" | "full";

const UNITS: [number, string][] = [
  [1_000_000_000_000, "trln"],
  [1_000_000_000, "mlrd"],
  [1_000_000, "mln"],
  [1_000, "ming"],
];

/** 1 400 000 → "1 400 000" (space-grouped, no decimals). */
export function formatSumFull(n: number): string {
  const sign = n < 0 ? "-" : "";
  return sign + Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** 1 400 000 → "1 mln 400 ming", 6 440 612 345 → "6 mlrd 440 mln", 950 → "950". */
export function formatSumWords(n: number): string {
  const sign = n < 0 ? "-" : "";
  let rest = Math.round(Math.abs(n));
  if (rest < 1_000) return sign + rest;

  const parts: string[] = [];
  for (const [size, label] of UNITS) {
    if (parts.length === 2) break;
    const q = Math.floor(rest / size);
    if (q > 0) parts.push(`${q} ${label}`);
    // after the first unit, only the very next unit is shown ("1 mln 400 ming", not "1 mln 5")
    else if (parts.length === 1) break;
    rest -= q * size;
  }
  if (parts.length === 1 && rest > 0 && rest < 1_000 && parts[0].endsWith("ming")) parts.push(String(rest));
  return sign + parts.join(" ");
}

export function formatSum(n: number, format: MoneyFormat): string {
  return `${format === "words" ? formatSumWords(n) : formatSumFull(n)} so'm`;
}

/** Compact label for chart axes: 1 400 000 → "1,4 mln". */
export function formatSumAxis(n: number): string {
  const abs = Math.abs(n);
  for (const [size, label] of UNITS) {
    if (abs >= size) {
      const v = (n / size).toFixed(1).replace(/\.0$/, "").replace(".", ",");
      return `${v} ${label}`;
    }
  }
  return String(Math.round(n));
}
