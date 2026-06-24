import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ROLE_PERMISSIONS } from "../src/constants";
import type { Permission } from "../src/constants";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create roles
  const roles = await Promise.all([
    db.role.upsert({
      where: { name: "DIRECTOR" },
      create: { name: "DIRECTOR", displayName: "Direktor", description: "To'liq huquq" },
      update: {},
    }),
    db.role.upsert({
      where: { name: "MANAGER" },
      create: { name: "MANAGER", displayName: "Menejer", description: "Cheklangan huquq" },
      update: {},
    }),
    db.role.upsert({
      where: { name: "WORKER" },
      create: { name: "WORKER", displayName: "Xodim", description: "Minimal huquq" },
      update: {},
    }),
  ]);
  console.log("✅ Roles created");

  // Create permissions
  const permEntries = Object.values(ROLE_PERMISSIONS).flat();
  const uniquePerms = [...new Set(permEntries)];

  for (const perm of uniquePerms) {
    const [resource, action] = perm.split(":");
    await db.permission.upsert({
      where: { action_resource: { action, resource } },
      create: { action, resource },
      update: {},
    });
  }
  console.log("✅ Permissions created");

  // Create admin user
  const hashedPassword = await bcrypt.hash("Admin@123", 12);
  const directorRole = roles[0];

  await db.user.upsert({
    where: { email: "admin@fabrika.uz" },
    create: {
      name: "Direktor",
      email: "admin@fabrika.uz",
      password: hashedPassword,
      roleId: directorRole.id,
      isActive: true,
    },
    update: {},
  });
  console.log("✅ Admin user created: admin@fabrika.uz / Admin@123");

  // Create default segments
  const segments = [
    { name: "VIP", color: "#f59e0b", description: "VIP mijozlar" },
    { name: "Ulgurji", color: "#6366f1", description: "Ulgurji xaridorlar" },
    { name: "Chakana", color: "#22c55e", description: "Chakana xaridorlar" },
    { name: "Yangi", color: "#3b82f6", description: "Yangi mijozlar" },
  ];

  for (const seg of segments) {
    await db.clientSegment.upsert({
      where: { name: seg.name },
      create: seg,
      update: {},
    });
  }
  console.log("✅ Client segments created");

  // Create default settings
  const settings = [
    { key: "company_name", value: "Fabric Zavodi", group: "general" },
    { key: "company_phone", value: "+998901234567", group: "general" },
    { key: "debt_reminder_days", value: 3, group: "automation" },
    { key: "reactivation_days", value: 30, group: "automation" },
    { key: "low_stock_threshold", value: 10, group: "inventory" },
  ];

  for (const setting of settings) {
    await db.setting.upsert({
      where: { key: setting.key },
      create: { key: setting.key, value: setting.value, group: setting.group },
      update: {},
    });
  }
  console.log("✅ Default settings created");

  // Default lead sources
  const leadSources = [
    "Instagram",
    "Telegram",
    "Facebook",
    "TikTok",
    "Tavsiya",
    "To'g'ridan-to'g'ri",
    "Veb-sayt",
  ];

  for (const name of leadSources) {
    await db.leadSource.upsert({
      where: { id: name },
      create: { name },
      update: {},
    }).catch(() => db.leadSource.findFirst({ where: { name } }));
  }
  console.log("✅ Lead sources created");

  console.log("\n🎉 Seed complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
