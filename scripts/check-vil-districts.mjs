import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const groups = await db.client.groupBy({
  by: ["region"],
  _count: { _all: true },
});

// toshkent_vil keywordlar
const VIL_KW = [
  "ташкентская","toshkent viloyati","toshkent vil","toshkent obl","tosh-obl","тош-обл","тош обл",
  "алмали","olmaliq","ангрен","angren","аккурган","oqqo'rg'on","ахангаран","охангарон","ohangaron",
  "бекобод","бекабад","bekobod","bekabad","чирчик","chirchiq","чиноз","chinoz",
  "кибрай","kibray","бука","букин","bo'ka","бостонли","бостанлык","bo'stonliq","bostonliq",
  "занги","зангиата","зангиатин","zangiota","ишонкул","eshangul","куйичирчик","quyichirchiq",
  "паркент","parkent","пскент","piskent","ташкентский район",
  "уртачирчик","o'rtachirchiq","юкоричирчик","yuqorichirchiq","янгию","янгийул","yangiyo'l","yangiyol",
];

// toshkent_sh keywordlar (excluded)
const SH_KW = [
  "ташкент","toshkent","tashkent","мирзо-улугбек","мирзо улугбек","алмазар","almazar",
  "учтеп","uchtepa","яшнаб","яшнобод","yashnobod","сергели","sergeli",
  "юнусаб","юнусобод","yunusab","yunusobod","бектемир","bektemir","мирабад","mirobod",
  "хамза","hamza","шайхант","шайхонт","shayxon","яккасарай","yakkasaroy","чиланзар","chilonzor",
];

function isVil(r) {
  if (SH_KW.some(k => r.includes(k))) return false;
  return VIL_KW.some(k => r.includes(k));
}

const vilGroups = groups
  .filter(g => g.region && isVil(g.region.toLowerCase()))
  .sort((a, b) => b._count._all - a._count._all);

console.log(`=== TOSHKENT VILOYATI HUDUDLARI (${vilGroups.length} ta) ===`);
for (const g of vilGroups) {
  const flag = g._count._all <= 2 ? " ⚠️  KAM!" : "";
  console.log(`"${g.region}" → ${g._count._all} ta${flag}`);
}
console.log(`\nJAMI: ${vilGroups.reduce((s,g) => s + g._count._all, 0)} ta`);

await db.$disconnect();
