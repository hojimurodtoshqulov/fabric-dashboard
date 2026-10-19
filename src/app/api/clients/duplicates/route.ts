import { type NextRequest } from "next/server";
import { requirePermission, createAuditLog } from "@/lib/auth/server";
import { apiSuccess, handleApiError, getPaginationParams } from "@/lib/utils/api";
import { db } from "@/lib/db";
import { scanAllDuplicates } from "@/services/crm/client-merge.service";

// Comparing every 1C client with ~4000 potential clients and merging takes a while.
export const maxDuration = 300;

const CLIENT_SELECT = {
  id: true, name: true, phone: true, phone2: true, inn: true, province: true,
  region: true, source: true, status: true, createdAt: true,
} as const;

/** Pending look-alikes (1C client ↔ potential client) waiting for a decision. */
export async function GET(req: NextRequest) {
  try {
    await requirePermission("clients:read");
    const { page, limit } = getPaginationParams(req.url);

    const where = { status: "PENDING" as const };
    const [candidates, total, merged] = await Promise.all([
      db.clientMatchCandidate.findMany({
        where,
        orderBy: [{ score: "desc" }, { createdAt: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          onecClient: {
            select: {
              ...CLIENT_SELECT,
              debts: {
                where: { syncSource: "1c", status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
                select: { amount: true },
              },
              _count: { select: { invoices: true } },
            },
          },
          potentialClient: { select: { ...CLIENT_SELECT, notes: true } },
        },
      }),
      db.clientMatchCandidate.count({ where }),
      db.clientMerge.count(),
    ]);

    return apiSuccess({
      candidates: candidates.map(({ onecClient, ...c }) => ({
        ...c,
        onecClient: {
          ...onecClient,
          debts: undefined,
          debt: onecClient.debts.reduce((s, d) => s + Number(d.amount), 0),
        },
      })),
      total, merged, page, limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/** Re-scan: auto-merge confident duplicates, queue the doubtful ones. */
export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("clients:delete");
    const result = await scanAllDuplicates({ userId: user.id });
    await createAuditLog(user.id, "UPDATE", "client_duplicates_scan", "all", null, result, req);
    return apiSuccess(result);
  } catch (e) {
    return handleApiError(e);
  }
}
