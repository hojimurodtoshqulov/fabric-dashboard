import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const found = await db.client.findMany({
  where: { region: "Юнусабадский район" },
  select: { id: true, name: true, phone: true, region: true },
});

if (found.length === 0) {
  console.log("Hech narsa topilmadi.");
} else {
  console.log(`O'chirilayotgan ${found.length} ta mijoz:`);
  for (const c of found) {
    console.log(`  - ${c.name} | ${c.phone} | ${c.region}`);
  }

  const result = await db.client.deleteMany({
    where: { region: "Юнусабадский район" },
  });
  console.log(`\nO'chirildi: ${result.count} ta`);
}

await db.$disconnect();
