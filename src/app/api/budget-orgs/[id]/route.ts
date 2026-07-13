import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

const VALID_STATUSES = ["ACTIVE", "INACTIVE", "PROSPECT", "CONTRACT", "REJECTED"];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const { id } = await params;

  try {
    const [org] = await db.$queryRaw<any[]>`
      SELECT bo.*, bo.status::text AS status
      FROM "budget_orgs" bo
      WHERE bo.id = ${id}
    `;
    if (!org) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    return NextResponse.json({ success: true, data: { org } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const { id } = await params;

  try {
    const body = await req.json();
    const { name, phone, phone2, email, address, region, province,
            status, inn, notes, contactPerson, position, orgType } = body;

    const sets: Prisma.Sql[] = [Prisma.sql`"updatedAt" = NOW()`];
    if (name          !== undefined) sets.push(Prisma.sql`name = ${name}`);
    if (phone         !== undefined) sets.push(Prisma.sql`phone = ${phone}`);
    if (phone2        !== undefined) sets.push(Prisma.sql`phone2 = ${phone2 || null}`);
    if (email         !== undefined) sets.push(Prisma.sql`email = ${email || null}`);
    if (address       !== undefined) sets.push(Prisma.sql`address = ${address || null}`);
    if (region        !== undefined) sets.push(Prisma.sql`region = ${region || null}`);
    if (province      !== undefined) sets.push(Prisma.sql`province = ${province || null}`);
    if (status !== undefined && VALID_STATUSES.includes(status))
      sets.push(Prisma.sql`status = ${status}::"BudgetOrgStatus"`);
    if (inn           !== undefined) sets.push(Prisma.sql`inn = ${inn || null}`);
    if (notes         !== undefined) sets.push(Prisma.sql`notes = ${notes || null}`);
    if (contactPerson !== undefined) sets.push(Prisma.sql`"contactPerson" = ${contactPerson || null}`);
    if (position      !== undefined) sets.push(Prisma.sql`position = ${position || null}`);
    if (orgType       !== undefined) sets.push(Prisma.sql`"orgType" = ${orgType || null}`);

    const [org] = await db.$queryRaw<any[]>(
      Prisma.sql`UPDATE "budget_orgs" SET ${Prisma.join(sets, ", ")} WHERE id = ${id} RETURNING *, status::text AS status`
    );
    if (!org) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

    return NextResponse.json({ success: true, data: { org } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const { id } = await params;

  try {
    await db.$executeRaw`DELETE FROM "budget_orgs" WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Server xatosi" }, { status: 500 });
  }
}
