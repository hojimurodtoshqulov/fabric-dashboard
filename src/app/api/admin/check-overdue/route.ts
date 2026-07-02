import { type NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/server";
import { invoiceService } from "@/services/sales/invoice.service";

export async function POST(_req: NextRequest) {
  try {
    await requirePermission("sales:read");
    const processed = await invoiceService.checkOverdueInvoices();
    return NextResponse.json({ success: true, data: { processed } });
  } catch (e) {
    console.error("[check-overdue]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Xatolik" },
      { status: 500 }
    );
  }
}
