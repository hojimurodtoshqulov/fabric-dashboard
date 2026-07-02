import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const status   = searchParams.get("status");
  const province = searchParams.get("province");
  const page  = Math.max(1, Number(searchParams.get("page")  ?? 1));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
  const skip  = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (status)   where.status = status;
  if (province) where.client = { province };

  const [debts, total] = await Promise.all([
    db.debt.findMany({
      where,
      include: { client: { select: { id: true, name: true, phone: true } } },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      skip,
      take: limit,
    }),
    db.debt.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: { debts, total, page, totalPages: Math.ceil(total / limit) } });
}
