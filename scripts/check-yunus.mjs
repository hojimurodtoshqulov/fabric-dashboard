import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const r = await db.client.groupBy({
  by: ["region"],
  where: { region: { contains: "юнус", mode: "insensitive" } },
  _count: { _all: true },
});
console.log("'юнус' bo'yicha:", r.length ? r.map(g => `"${g.region}" → ${g._count._all} ta`).join("\n") : "HECH NARSA YO'Q");

const r2 = await db.client.groupBy({
  by: ["region"],
  where: { region: { contains: "yunus", mode: "insensitive" } },
  _count: { _all: true },
});
console.log("'yunus' bo'yicha:", r2.length ? r2.map(g => `"${g.region}" → ${g._count._all} ta`).join("\n") : "HECH NARSA YO'Q");

await db.$disconnect();
