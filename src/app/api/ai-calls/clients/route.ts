import { type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, handleApiError, getPaginationParams } from "@/lib/utils/api";
import { db } from "@/lib/db";
import type { ClientStatus } from "@prisma/client";

const SEGMENT_STATUS: Record<string, ClientStatus> = {
  doimiy:     "ACTIVE",
  qarzdor:    "DEBTOR",
  yoqotilgan: "LOST",
  yangi:      "PROSPECT",
};

export async function GET(req: NextRequest) {
  try {
    await requirePermission("calls:read");

    const { searchParams } = new URL(req.url);
    const segment  = searchParams.get("segment") || "";
    const province = searchParams.get("province") || "";
    const { page, limit } = getPaginationParams(req.url);

    const status = SEGMENT_STATUS[segment];
    if (!status) return apiSuccess({ clients: [], total: 0, page, limit, totalPages: 0 });

    const where = {
      status,
      ...(province && province !== "all" && { province }),
    };

    const [clients, total] = await Promise.all([
      db.client.findMany({
        where,
        select: {
          id:           true,
          name:         true,
          phone:        true,
          province:     true,
          status:       true,
          lastActivity: true,
          debts: {
            where: { status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
            select: { amount: true, paidAmount: true },
            take:   1,
          },
          invoices: {
            orderBy: { createdAt: "desc" },
            select:  { total: true, createdAt: true },
            take:    1,
          },
        },
        orderBy: { lastActivity: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
      db.client.count({ where }),
    ]);

    return apiSuccess({
      clients: clients.map((c) => ({
        id:           c.id,
        name:         c.name,
        phone:        c.phone,
        province:     c.province,
        status:       c.status,
        lastActivity: c.lastActivity,
        debtAmount:   c.debts[0] ? Number(c.debts[0].amount) - Number(c.debts[0].paidAmount) : null,
        lastInvoice:  c.invoices[0] ? { total: Number(c.invoices[0].total), date: c.invoices[0].createdAt } : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
