import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

// "Toshkent shahri — Yashnobod" → "Yashnobod" kabi barcha prefikslarni tozalaydi
const PREFIXES = [
  "Toshkent shahri — ",
  "Toshkent viloyati — ",
  "Andijon — ",
  "Buxoro — ",
  "Farg'ona — ",
  "Jizzax — ",
  "Xorazm — ",
  "Namangan — ",
  "Navoiy — ",
  "Qashqadaryo — ",
  "Samarqand — ",
  "Sirdaryo — ",
  "Surxondaryo — ",
  "Qoraqalpog'iston — ",
];

let total = 0;

for (const prefix of PREFIXES) {
  const found = await db.client.findMany({
    where: { region: { startsWith: prefix } },
    select: { id: true, region: true },
  });

  if (found.length === 0) continue;

  console.log(`"${prefix}" prefiksi: ${found.length} ta topildi`);
  for (const c of found) {
    await db.client.update({
      where: { id: c.id },
      data: { region: c.region.substring(prefix.length) },
    });
  }
  total += found.length;
}

console.log(`\nJami ${total} ta yozuv yangilandi.`);
await db.$disconnect();
