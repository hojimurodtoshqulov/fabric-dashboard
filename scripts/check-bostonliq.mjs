import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const r = await db.client.groupBy({
  by: ["region"],
  where: {
    OR: [
      { region: { contains: "бостан", mode: "insensitive" } },
      { region: { contains: "босто", mode: "insensitive" } },
      { region: { contains: "bostan", mode: "insensitive" } },
      { region: { contains: "bosto", mode: "insensitive" } },
    ]
  },
  _count: { _all: true },
});

if (r.length === 0) {
  console.log("Hech narsa topilmadi.");
} else {
  for (const g of r) console.log(`"${g.region}" → ${g._count._all} ta`);
}

await db.$disconnect();
