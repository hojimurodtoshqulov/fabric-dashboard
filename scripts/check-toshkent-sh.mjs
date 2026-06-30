import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

// Barcha region larni olamiz
const groups = await db.client.groupBy({
  by: ["region"],
  _count: { _all: true },
});
groups.sort((a, b) => b._count._all - a._count._all);

// provinces.ts dan toshkent_sh keywordslar
const TOSHKENT_SH_KW = [
  "ташкент", "toshkent", "tashkent",
  "мирзо-улугбек", "мирзо улугбек", "мирзоулугбек", "mirzo ulug'bek",
  "алмазар", "almazar",
  "учтеп", "uchtepa",
  "яшнаб", "яшнобод", "yashnobod",
  "сергели", "sergeli",
  "юнусаб", "юнусобод", "yunusab", "yunusobod",
  "бектемир", "bektemir",
  "мирабад", "мирабодский", "mirobod",
  "хамза", "hamza",
  "шайхант", "шайхонт", "shayxon",
  "яккасарай", "yakkasaroy",
  "чиланзар", "chilonzor",
];

const TOSHKENT_VIL_KW = [
  "ташкентская", "toshkent viloyati", "toshkent vil",
  "алмалык", "olmaliq", "ангрен", "angren",
  "аккурган", "oqqo'rg'on", "oqqurgon",
  "ахангаран", "охангарон", "ohangaron",
  "бекобод", "бекабад", "bekobod", "bekabad",
  "чирчик", "chirchiq", "кибрай", "kibray",
  "бука", "букин", "bo'ka",
  "бостанлык", "bo'stonliq",
  "зангиата", "зангиатин", "zangiota",
  "ишонкул", "eshangul",
  "куйичирчик", "quyichirchiq",
  "паркент", "parkent", "пскент", "piskent",
  "ташкентский район",
  "уртачирчик", "o'rtachirchiq",
  "юкоричирчик", "yuqorichirchiq",
  "янгийул", "yangiyo'l",
];

function isToshkentVil(r) {
  return TOSHKENT_VIL_KW.some(k => r.includes(k));
}
function isToshkentSh(r) {
  if (isToshkentVil(r)) return false; // viloyat avval
  return TOSHKENT_SH_KW.some(k => r.includes(k));
}

console.log("=== TOSHKENT SHAHRIGA TEGISHLI REGIONLAR ===");
let total = 0;
for (const g of groups) {
  if (!g.region) continue;
  const r = g.region.toLowerCase();
  if (isToshkentSh(r)) {
    console.log(`"${g.region}" → ${g._count._all} ta`);
    total += g._count._all;
  }
}
console.log(`\nJAMI: ${total} ta mijoz`);

console.log("\n=== YUNUS-TEGISHLI BARCHA YOZUVLAR ===");
for (const g of groups) {
  if (!g.region) continue;
  const r = g.region.toLowerCase();
  if (r.includes("юнус") || r.includes("yunus")) {
    const matched = isToshkentSh(r) ? "toshkent_sh ✓" : isToshkentVil(r) ? "toshkent_vil" : "MOS KELMADI ✗";
    console.log(`"${g.region}" → ${g._count._all} ta [${matched}]`);
  }
}

await db.$disconnect();
