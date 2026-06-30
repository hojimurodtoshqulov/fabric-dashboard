import * as XLSX from "xlsx";
import { readFileSync, readdirSync } from "fs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const FOLDER = "D:\\тошкент";
const CREATED_BY_ID = "cmqs73vmz000xt334mxsvupla";

const STATUS_MAP = {
  "активный": "ACTIVE",
  "неактивный": "INACTIVE",
  "должник": "DEBTOR",
  "потерян": "LOST",
  "перспектива": "PROSPECT",
};

function cleanPhone(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  // Birinchi raqamni olish (bo'sh joy yoki vergul bilan ajratilgan bo'lsa)
  const match = str.replace(/[^\d\s\+]/g, " ").trim().match(/[\+\d]{9,13}/);
  return match ? match[0] : str.slice(0, 20) || null;
}

const files = readdirSync(FOLDER).filter(f => f.endsWith(".xlsx"));
console.log(`Topildi: ${files.length} ta fayl\n`);

let totalCreated = 0, totalUpdated = 0, totalSkipped = 0;

for (const fileName of files) {
  const filePath = `${FOLDER}\\${fileName}`;
  const baseName = fileName.replace(/\.xlsx$/i, "");

  let wb;
  try {
    wb = XLSX.read(readFileSync(filePath));
  } catch {
    console.log(`[XATO] ${fileName} — o'qib bo'lmadi`);
    continue;
  }

  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  if (rows.length < 2) { console.log(`[BO'SH] ${fileName}`); continue; }

  const headers = rows[0].map(h => String(h).toLowerCase().trim());

  // Ustun indekslarini topish
  const nameIdx   = headers.findIndex(h => h.includes("назван") || h.includes("ism") || h.includes("name") || h.includes("mijoz"));
  const phoneIdx  = headers.findIndex(h => h.includes("телефон") || h.includes("phone") || h.includes("tel") || h.includes("raqam"));
  const regionIdx = headers.findIndex(h => h.includes("регион") || h.includes("region") || h.includes("viloyat") || h.includes("hudud") || h.includes("район") || h.includes("область"));
  const statusIdx = headers.findIndex(h => h.includes("статус") || h.includes("status") || h.includes("holat"));
  const notesIdx  = headers.findIndex(h => h.includes("адрес") || h.includes("address") || h.includes("manzil") || h.includes("izoh") || h.includes("note") || h.includes("примечание"));

  if (nameIdx === -1 || phoneIdx === -1) {
    console.log(`[O'TKAZILDI] ${fileName} — ism yoki telefon ustuni topilmadi`);
    continue;
  }

  const dataRows = rows.slice(1).filter(r => r.some(c => c !== ""));

  const prepared = dataRows.map((row, i) => {
    const name  = String(row[nameIdx] ?? "").trim() || "Noma'lum";
    const rawPhone = String(row[phoneIdx] ?? "").trim();
    const phone = cleanPhone(rawPhone) || `NOPHONE_bulk_${Date.now()}_${i}`;
    const region = regionIdx >= 0
      ? (String(row[regionIdx] ?? "").trim() || baseName)
      : baseName;
    const rawStatus = statusIdx >= 0 ? String(row[statusIdx] ?? "").toLowerCase().trim() : "";
    const status = STATUS_MAP[rawStatus] ?? "ACTIVE";
    const notes = notesIdx >= 0 ? String(row[notesIdx] ?? "").trim() || undefined : undefined;
    return { name, phone, region, status, notes };
  });

  // Mavjud telefonlarni tekshirish
  const realRows = prepared.filter(r => !r.phone.startsWith("NOPHONE_"));
  const noPhoneRows = prepared.filter(r => r.phone.startsWith("NOPHONE_"));
  const phones = realRows.map(r => r.phone);

  const existingMap = new Map();
  if (phones.length > 0) {
    const found = await db.client.findMany({
      where: { phone: { in: phones } },
      select: { id: true, phone: true },
    });
    for (const c of found) existingMap.set(c.phone, c.id);
  }

  const toInsert = realRows.filter(r => !existingMap.has(r.phone));
  const toUpdate = realRows.filter(r => existingMap.has(r.phone) && r.region);
  const skipped  = realRows.filter(r => existingMap.has(r.phone) && !r.region).length;

  let created = 0, updated = 0;

  if ([...noPhoneRows, ...toInsert].length > 0) {
    const result = await db.client.createMany({
      data: [...noPhoneRows, ...toInsert].map(r => ({
        ...r,
        createdById: CREATED_BY_ID,
        lastActivity: new Date(),
      })),
      skipDuplicates: true,
    });
    created = result.count;
  }

  if (toUpdate.length > 0) {
    await db.$transaction(
      toUpdate.map(r =>
        db.client.update({
          where: { id: existingMap.get(r.phone) },
          data: { region: r.region },
        })
      )
    );
    updated = toUpdate.length;
  }

  totalCreated += created;
  totalUpdated += updated;
  totalSkipped += skipped;

  console.log(`✓ ${fileName.padEnd(30)} → yaratildi: ${created}, yangilandi: ${updated}, o'tkazildi: ${skipped}`);
}

console.log(`\n═══════════════════════════════════`);
console.log(`JAMI: yaratildi ${totalCreated}, yangilandi ${totalUpdated}, o'tkazildi ${totalSkipped}`);

await db.$disconnect();
