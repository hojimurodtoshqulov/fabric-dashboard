import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/server";
import { db as prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try { await requireAuth(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [debts, total] = await Promise.all([
    prisma.debt.findMany({
      where,
      include: { client: { select: { id: true, name: true, phone: true } } },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      skip,
      take: limit,
    }),
    prisma.debt.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: { debts, total, page, totalPages: Math.ceil(total / limit) } });
}
