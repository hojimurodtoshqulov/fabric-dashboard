import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

// "Toshkent shahri" → "Яшнобод" ga o'zgartirish
const result = await db.client.updateMany({
  where: { region: "Toshkent shahri" },
  data: { region: "Яшнобод" },
});

console.log(`Yangilandi: ${result.count} ta mijoz → region = "Яшнобод"`);
await db.$disconnect();
