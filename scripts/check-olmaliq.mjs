import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const r = await db.client.groupBy({
  by: ["region"],
  where: {
    OR: [
      { region: { contains: "олмал", mode: "insensitive" } },
      { region: { contains: "алмал", mode: "insensitive" } },
      { region: { contains: "olmal", mode: "insensitive" } },
    ]
  },
  _count: { _all: true },
});

if (r.length === 0) {
  console.log("Olmaliq bo'yicha hech narsa topilmadi.");
} else {
  for (const g of r) {
    console.log(`"${g.region}" → ${g._count._all} ta`);
  }
}

await db.$disconnect();
