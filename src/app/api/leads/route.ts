import { type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, apiCreated, handleApiError, getPaginationParams } from "@/lib/utils/api";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("messages:read");

    const { searchParams } = new URL(req.url);
    const source   = searchParams.get("source") || "";
    const status   = searchParams.get("status") || "";
    const province = searchParams.get("province") || "";
    const search   = searchParams.get("search") || "";
    const { page, limit, skip } = getPaginationParams(req.url);

    const where: Record<string, unknown> = {};
    if (source)   where.source   = source;
    if (status)   where.status   = status;
    if (province) where.province = province;
    if (search) {
      where.OR = [
        { name:    { contains: search, mode: "insensitive" } },
        { phone:   { contains: search } },
        { message: { contains: search, mode: "insensitive" } },
      ];
    }

    const [leads, total] = await Promise.all([
      (db as any).lead.findMany({
        where,
        include: {
          client:     { select: { id: true, name: true, phone: true } },
          assignedTo: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      (db as any).lead.count({ where }),
    ]);

    return apiSuccess({ leads, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission("messages:send");

    const body = await req.json();
    const { source, name, phone, province, message, notes, metadata } = body;

    if (!source || !message) {
      return handleApiError(Object.assign(new Error("source va message majburiy"), { code: "VALIDATION_ERROR" }));
    }

    const lead = await (db as any).lead.create({
      data: { source, name, phone, province, message, notes, metadata, status: "NEW" },
    });

    return apiCreated({ lead });
  } catch (e) {
    return handleApiError(e);
  }
}
