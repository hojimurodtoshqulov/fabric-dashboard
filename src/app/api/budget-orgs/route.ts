import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

const VALID_STATUSES = ["ACTIVE", "INACTIVE", "PROSPECT", "CONTRACT", "REJECTED"];

export async function GET(req: NextRequest) {
  let user: any;
  try { user = await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const province = searchParams.get("province") || null;
  const status   = searchParams.get("status")   || null;
  const search   = searchParams.get("search")   || null;
  const page     = Math.max(1, Number(searchParams.get("page")  ?? 1));
  const limit    = Math.min(100, Number(searchParams.get("limit") ?? 50));
  const skip     = (page - 1) * limit;

  try {
    const conditions: Prisma.Sql[] = [];
    if (province) conditions.push(Prisma.sql`bo.province = ${province}`);
    if (status && VALID_STATUSES.includes(status))
      conditions.push(Prisma.sql`bo.status = ${status}::"BudgetOrgStatus"`);
    if (search)
      conditions.push(Prisma.sql`(
        bo.name ILIKE ${"%" + search + "%"} OR
        bo.phone ILIKE ${"%" + search + "%"} OR
        bo."contactPerson" ILIKE ${"%" + search + "%"} OR
        bo.inn ILIKE ${"%" + search + "%"}
      )`);

    const where = conditions.length
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty;

    const orgs = await db.$queryRaw<any[]>(Prisma.sql`
      SELECT
        bo.id, bo.name, bo.phone, bo.phone2, bo.email, bo.address,
        bo.region, bo.province, bo.status::text, bo.inn, bo.notes,
        bo."contactPerson", bo.position, bo."orgType",
        bo."createdAt", bo."updatedAt"
      FROM "budget_orgs" bo
      ${where}
      ORDER BY bo.name ASC
      LIMIT ${limit} OFFSET ${skip}
    `);

    const [{ cnt }] = await db.$queryRaw<[{ cnt: bigint }]>(
      Prisma.sql`SELECT COUNT(*)::bigint AS cnt FROM "budget_orgs" bo ${where}`
    );

    return NextResponse.json({ success: true, data: { orgs, total: Number(cnt), page } });
  } catch (e: any) {
    console.error("[budget-orgs GET]", e);
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let user: any;
  try { user = await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const body = await req.json();
    const { name, phone, phone2, email, address, region, province, status,
            inn, notes, contactPerson, position, orgType } = body;

    if (!name)  return NextResponse.json({ error: "Nomi majburiy" },  { status: 400 });
    if (!phone) return NextResponse.json({ error: "Telefon majburiy" }, { status: 400 });

    const id  = randomUUID();
    const st  = VALID_STATUSES.includes(status) ? status : "PROSPECT";

    const [org] = await db.$queryRaw<any[]>`
      INSERT INTO "budget_orgs"
        (id, name, phone, phone2, email, address, region, province,
         status, inn, notes, "contactPerson", position, "orgType",
         "createdById", "createdAt", "updatedAt")
      VALUES (
        ${id}, ${name}, ${phone}, ${phone2 || null}, ${email || null},
        ${address || null}, ${region || null}, ${province || null},
        ${st}::"BudgetOrgStatus",
        ${inn || null}, ${notes || null}, ${contactPerson || null},
        ${position || null}, ${orgType || null},
        ${user.id}, NOW(), NOW()
      )
      RETURNING *, status::text AS status
    `;

    return NextResponse.json({ success: true, data: { org } }, { status: 201 });
  } catch (e: any) {
    console.error("[budget-orgs POST]", e);
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}
