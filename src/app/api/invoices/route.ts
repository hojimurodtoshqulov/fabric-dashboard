import { type NextRequest } from "next/server";
import { invoiceService } from "@/services/sales/invoice.service";
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, apiCreated, handleApiError, getPaginationParams } from "@/lib/utils/api";
import { createAuditLog } from "@/lib/auth/server";
import type { InvoiceStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("sales:read");
    const { page, limit, search } = getPaginationParams(req.url);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as InvoiceStatus | null;
    const clientId = searchParams.get("clientId") || undefined;

    const result = await invoiceService.list({ page, limit, search, ...(status && { status }), clientId });
    return apiSuccess(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("sales:create");
    const body = await req.json();

    const invoice = await invoiceService.create({ ...body, createdById: user.id });
    await createAuditLog(user.id, "CREATE", "invoice", invoice.id, null, invoice, req);
    return apiCreated(invoice);
  } catch (e) {
    return handleApiError(e);
  }
}
