import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

// province null bo'lgan, region "yangi hayot" bo'lgan clientlarni toshkent_sh ga bog'laymiz
const clients = await db.client.findMany({
  where: { province: null, name: { contains: "jonibek", mode: "insensitive" } },
  select: { id: true, name: true, region: true, province: true },
});

console.log("Topilgan:", clients);

for (const c of clients) {
  await db.client.update({ where: { id: c.id }, data: { province: "toshkent_sh" } });
  console.log(`Yangilandi: ${c.name} (${c.region}) → toshkent_sh`);
}

// Umumiy province=null bo'lgan clientlar soni
const nullCount = await db.client.count({ where: { province: null } });
console.log(`\nProvince yo'q clientlar: ${nullCount}`);

await db.$disconnect();
