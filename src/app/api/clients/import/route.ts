import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/server";
import { db } from "@/lib/db";
import type { ClientStatus } from "@prisma/client";

interface ClientRow {
  name: string;
  phone: string;
  company?: string;
  email?: string;
  region?: string;
  status?: string;
  notes?: string;
  _rowNum?: number;
}

interface ImportBody {
  rows: ClientRow[];
  province?: string;
}

const VALID_STATUSES = new Set(["ACTIVE", "INACTIVE", "LOST", "DEBTOR", "PROSPECT", "COMPETITOR", "RISK"]);

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("clients:create");
    const body = await req.json() as ImportBody;

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json({ error: "Bo'sh ma'lumot" }, { status: 400 });
    }
    if (body.rows.length > 1000) {
      return NextResponse.json({ error: "Maksimum 1000 ta qator" }, { status: 400 });
    }

    const now = Date.now();
    const prepared = body.rows.map((row, i) => {
      const rowNum = row._rowNum ?? i + 2;
      const hasName  = !!row.name?.trim();
      const hasPhone = !!row.phone?.trim();

      const name  = hasName  ? row.name.trim()  : "Noma'lum";
      const phone = hasPhone ? row.phone.trim()  : `NOPHONE_${now}_${rowNum}`;

      const status: ClientStatus = (!hasName || !hasPhone)
        ? "INACTIVE"
        : VALID_STATUSES.has((row.status ?? "").toUpperCase())
          ? (row.status!.toUpperCase() as ClientStatus)
          : "ACTIVE";

      const errorNote = !hasName && !hasPhone
        ? "Import xatosi: ism va telefon yo'q"
        : !hasName  ? "Import xatosi: ism ko'rsatilmagan"
        : !hasPhone ? "Import xatosi: telefon ko'rsatilmagan"
        : undefined;

      const region  = row.region?.trim() || undefined;
      const notes   = errorNote
        ? [errorNote, row.notes?.trim()].filter(Boolean).join(" | ")
        : row.notes?.trim() || undefined;

      return { name, phone, region, status, notes,
        company: row.company?.trim() || undefined,
        email:   row.email?.trim()   || undefined };
    });
    const importProvince = body.province;

    // NOPHONE_* larni ajratamiz — bular har doim qo'shiladi
    const noPhoneRows  = prepared.filter(r => r.phone.startsWith("NOPHONE_"));
    const realRows     = prepared.filter(r => !r.phone.startsWith("NOPHONE_"));
    const realPhones   = realRows.map(r => r.phone);

    // Bazada mavjud telefonlarni topamiz
    const existingMap = new Map<string, string>(); // phone → id
    if (realPhones.length > 0) {
      const found = await db.client.findMany({
        where: { phone: { in: realPhones } },
        select: { id: true, phone: true },
      });
      for (const c of found) existingMap.set(c.phone, c.id);
    }

    const toInsert = realRows.filter(r => !existingMap.has(r.phone));
    // Mavjud telefonli mijozlar: agar region bor bo'lsa — yangilaymiz
    const toUpdate  = realRows.filter(r => existingMap.has(r.phone) && r.region);

    // NOPHONE_ va yangi telefonlarni qo'shamiz
    let created = 0;
    const insertAll = [...noPhoneRows, ...toInsert];
    if (insertAll.length > 0) {
      const result = await db.client.createMany({
        data: insertAll.map(r => ({
          ...r,
          createdById: user.id,
          lastActivity: new Date(),
        })),
        skipDuplicates: true,
      });
      created = result.count;
      // Province raw SQL bilan yangilaymiz
      if (importProvince) {
        const insertedPhones = insertAll.map(r => r.phone);
        await db.$executeRaw`
          UPDATE clients SET province = ${importProvince}
          WHERE phone = ANY(${insertedPhones}::text[]) AND province IS NULL
        `;
      }
    }

    // Mavjud mijozlar region va province ni yangilaymiz
    let updated = 0;
    if (toUpdate.length > 0) {
      await db.$transaction(
        toUpdate.map(r =>
          db.client.update({
            where: { id: existingMap.get(r.phone)! },
            data: { ...(r.region && { region: r.region }) },
          })
        )
      );
      // Province raw SQL bilan
      if (importProvince && toUpdate.length > 0) {
        const updateIds = toUpdate.map(r => existingMap.get(r.phone)!);
        await db.$executeRaw`
          UPDATE clients SET province = ${importProvince}
          WHERE id = ANY(${updateIds}::text[])
        `;
      }
      updated = toUpdate.length;
    }

    const skipped = realRows.filter(r => existingMap.has(r.phone) && !r.region).length;

    return NextResponse.json({
      success: true,
      data: { created, updated, skipped, total: body.rows.length },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
