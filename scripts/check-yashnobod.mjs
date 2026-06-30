import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const r = await db.client.groupBy({
  by: ["region"],
  where: { region: { contains: "яшн", mode: "insensitive" } },
  _count: { _all: true },
});
for (const g of r) console.log(JSON.stringify(g.region), "→", g._count._all, "ta");
await db.$disconnect();
