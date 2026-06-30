import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const result = await db.client.updateMany({
  where: { region: "урта чирчик" },
  data: { region: "Уртачирчикский район" },
});

console.log(`Yangilandi: ${result.count} ta → "Уртачирчикский район"`);
await db.$disconnect();
