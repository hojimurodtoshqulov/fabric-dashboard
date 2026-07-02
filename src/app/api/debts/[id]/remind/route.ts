import { type NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { callService } from "@/services/calls/call.service";
import { scheduleMessage } from "@/lib/queue";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("sales:read");
    const { id } = await params;
    const { type } = (await req.json()) as { type: "AI_CALL" | "TELEGRAM" };

    const debt = await db.debt.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, phone: true, telegramId: true } },
      },
    });
    if (!debt) return NextResponse.json({ error: "Qarz topilmadi" }, { status: 404 });

    const remaining = Number(debt.amount) - Number(debt.paidAmount);
    const dueDateStr = new Date(debt.dueDate).toLocaleDateString("uz-UZ");

    if (type === "AI_CALL") {
      // callService.initiateCall() → avval db.call yozuvi yaratadi, keyin queue ga qo'yadi
      const call = await callService.initiateCall({
        clientId: debt.clientId,
        purpose: "DEBT_REMINDER",
        initiatedById: user.id,
        context: {
          debtAmount: remaining,
          dueDate: debt.dueDate.toISOString(),
          debtId: debt.id,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          message: `AI qo'ng'iroq navbatga qo'yildi: ${debt.client.name}`,
          callId: call.id,
        },
      });
    }

    if (type === "TELEGRAM") {
      if (!debt.client.telegramId) {
        return NextResponse.json(
          { error: "Mijozning Telegram ID si yo'q" },
          { status: 400 }
        );
      }

      const text =
        `⚠️ Qarz eslatmasi\n\n` +
        `Salom, ${debt.client.name}!\n\n` +
        `Sizda ${remaining.toLocaleString()} so'm qarz mavjud.\n` +
        `Muddat: ${dueDateStr}\n\n` +
        `Iltimos, qarzni imkon qadar tezroq to'lang.`;

      scheduleMessage({
        type: "TELEGRAM",
        to: debt.client.telegramId,
        clientId: debt.clientId,
        message: text,
        metadata: { purpose: "DEBT_REMINDER", debtId: debt.id },
      }).catch((e) => console.warn("[remind] TELEGRAM:", e?.message));

      return NextResponse.json({
        success: true,
        data: { message: `Telegram xabar navbatga qo'yildi: ${debt.client.name}` },
      });
    }

    return NextResponse.json({ error: "Noto'g'ri tur" }, { status: 400 });
  } catch (e) {
    console.error("[remind]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Xatolik" },
      { status: 500 }
    );
  }
}
