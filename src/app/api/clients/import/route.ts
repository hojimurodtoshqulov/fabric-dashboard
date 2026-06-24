import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/server";
import { db } from "@/lib/db";

interface ClientRow {
  name: string;
  phone: string;
  company?: string;
  email?: string;
  region?: string;
  status?: string;
  notes?: string;
}

const VALID_STATUSES = new Set(["ACTIVE", "INACTIVE", "LOST", "DEBTOR", "PROSPECT", "COMPETITOR", "RISK"]);

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("clients:create");
    const body = await req.json() as { rows: ClientRow[] };

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json({ error: "Bo'sh ma'lumot" }, { status: 400 });
    }
    if (body.rows.length > 1000) {
      return NextResponse.json({ error: "Maksimum 1000 ta qator" }, { status: 400 });
    }

    const errors: Array<{ row: number; message: string }> = [];
    const valid: ClientRow[] = [];

    for (let i = 0; i < body.rows.length; i++) {
      const row = body.rows[i];
      if (!row.name?.trim()) { errors.push({ row: i + 2, message: "Ism bo'sh" }); continue; }
      if (!row.phone?.trim()) { errors.push({ row: i + 2, message: "Telefon bo'sh" }); continue; }
      if (row.status && !VALID_STATUSES.has(row.status.toUpperCase())) {
        row.status = "ACTIVE";
      }
      valid.push({
        name: row.name.trim(),
        phone: row.phone.trim(),
        company: row.company?.trim() || undefined,
        email: row.email?.trim() || undefined,
        region: row.region?.trim() || undefined,
        status: row.status?.toUpperCase() || "ACTIVE",
        notes: row.notes?.trim() || undefined,
      });
    }

    if (valid.length === 0) {
      return NextResponse.json({ error: "Yaroqli qatorlar topilmadi", errors }, { status: 400 });
    }

    // Batch insert — skip duplicates by phone
    const existingPhones = new Set(
      (await db.client.findMany({
        where: { phone: { in: valid.map(r => r.phone) } },
        select: { phone: true },
      })).map(c => c.phone)
    );

    const toInsert = valid.filter(r => !existingPhones.has(r.phone));
    const skipped = valid.length - toInsert.length;

    let created = 0;
    if (toInsert.length > 0) {
      // createMany for performance
      await db.client.createMany({
        data: toInsert.map(r => ({
          name: r.name,
          phone: r.phone,
          company: r.company,
          email: r.email,
          region: r.region,
          status: (r.status || "ACTIVE") as import("@prisma/client").ClientStatus,
          notes: r.notes,
          createdById: user.id,
          lastActivity: new Date(),
        })),
        skipDuplicates: true,
      });
      created = toInsert.length;
    }

    return NextResponse.json({
      success: true,
      data: { created, skipped, errors, total: body.rows.length },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
