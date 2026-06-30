import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const keywords = [
  "ташкентская", "toshkent viloyati", "toshkent vil",
  "алмалык", "olmaliq", "ангрен", "angren",
  "бекобод", "bekobod", "чирчик", "chirchiq",
  "оханганган", "ohangaron", "зангиата", "zangiota",
  "паркент", "parkent", "пскент", "piskent",
  "ташкентский район", "бостанлык", "бука",
  "г. ангрен", "г.ангрен",
];

const where = {
  OR: keywords.map((k) => ({ region: { contains: k, mode: "insensitive" } })),
};

const count = await db.client.count({ where });
console.log("Topildi:", count, "ta mijoz");

const result = await db.client.deleteMany({ where });
console.log("O'chirildi:", result.count, "ta mijoz");

await db.$disconnect();
