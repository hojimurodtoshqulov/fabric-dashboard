import { type NextRequest } from "next/server";
import { invoiceService } from "@/services/sales/invoice.service";
import { requirePermission } from "@/lib/auth/server";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("sales:read");
    const { id } = await params;
    const invoice = await invoiceService.getById(id);
    if (!invoice) return apiError("Faktura topilmadi", 404);
    return apiSuccess(invoice);
  } catch (e) {
    return handleApiError(e);
  }
}
