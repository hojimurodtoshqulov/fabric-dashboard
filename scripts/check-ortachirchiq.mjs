import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const r = await db.client.groupBy({
  by: ["region"],
  where: {
    OR: [
      { region: { contains: "чирчи", mode: "insensitive" } },
      { region: { contains: "chirchi", mode: "insensitive" } },
      { region: { contains: "урта", mode: "insensitive" } },
      { region: { contains: "o'rta", mode: "insensitive" } },
      { region: { contains: "orta", mode: "insensitive" } },
    ]
  },
  _count: { _all: true },
});

for (const g of r) console.log(`"${g.region}" → ${g._count._all} ta`);
if (!r.length) console.log("Hech narsa topilmadi.");

await db.$disconnect();
