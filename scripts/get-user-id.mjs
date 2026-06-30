import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const user = await db.user.findFirst({ select: { id: true, email: true } });
console.log(JSON.stringify(user));
await db.$disconnect();
