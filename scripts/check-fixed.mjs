import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

// Chиназ va Алмалyk larni tekshirish
const r = await db.client.groupBy({
  by: ["region"],
  where: {
    OR: [
      { region: { contains: "чиназ", mode: "insensitive" } },
      { region: { contains: "алмалык", mode: "insensitive" } },
      { region: { contains: "алмалыq", mode: "insensitive" } },
      { region: { contains: "алмал", mode: "insensitive" } },
      { region: { contains: "чиназ", mode: "insensitive" } },
    ]
  },
  _count: { _all: true },
});

for (const g of r) console.log(`"${g.region}" → ${g._count._all} ta`);
if (!r.length) console.log("Hech narsa topilmadi.");

await db.$disconnect();
