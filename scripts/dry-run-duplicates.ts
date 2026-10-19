// Read-only preview of what the duplicate scan would do. Usage: npx tsx scripts/dry-run-duplicates.ts
import { PrismaClient } from "@prisma/client";
import { MatchIndex, pickAutoMerge } from "../src/lib/clients/matching";

const db = new PrismaClient();
const SELECT = { id: true, name: true, phone: true, phone2: true, inn: true, province: true } as const;

async function main() {
  const onec = await db.client.findMany({ where: { source: "ONEC" }, select: SELECT });
  const pots = await db.client.findMany({ where: { source: { not: "ONEC" } }, select: SELECT });
  const index = new MatchIndex(pots);

  const auto: [string, string, string][] = [];
  const review: [string, string, string][] = [];
  for (const o of onec) {
    const matches = index.find(o);
    const a = pickAutoMerge(matches, o.province);
    if (a) { auto.push([o.name, a.target.name, `${a.reason} ${a.score.toFixed(2)}`]); index.remove(a.target.id); }
    for (const m of matches) if (m !== a) review.push([o.name, m.target.name, `${m.reason} ${m.score.toFixed(2)}`]);
  }
  console.log(`1C: ${onec.length}  potential+new: ${pots.length}  auto-merge: ${auto.length}  review: ${review.length}`);
  console.log("── AUTO ──");
  for (const r of auto) console.log(r.join("  |  "));
  console.log("── REVIEW (first 40) ──");
  for (const r of review.slice(0, 40)) console.log(r.join("  |  "));
}

main().finally(() => db.$disconnect());
