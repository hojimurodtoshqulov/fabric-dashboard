import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const r = await db.client.groupBy({
  by: ["region"],
  where: {
    OR: [
      { region: { contains: "чинов", mode: "insensitive" } },
      { region: { contains: "чиноз", mode: "insensitive" } },
      { region: { contains: "chinoz", mode: "insensitive" } },
      { region: { contains: "chinov", mode: "insensitive" } },
    ]
  },
  _count: { _all: true },
});

for (const g of r) console.log(`"${g.region}" → ${g._count._all} ta`);
if (!r.length) console.log("Hech narsa topilmadi.");

await db.$disconnect();
