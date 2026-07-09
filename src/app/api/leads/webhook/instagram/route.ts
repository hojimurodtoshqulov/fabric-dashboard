// Instagram Messaging webhook (Meta Graph API)
// Setup: Meta Developer App → Webhooks → instagram_messages
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_TOKEN ?? "selxozmash_instagram_verify";

// Webhook verification (Meta sends a GET to verify)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// Incoming message events
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const entries = body?.entry ?? [];
    for (const entry of entries) {
      const messaging = entry?.messaging ?? [];
      for (const event of messaging) {
        if (!event.message?.text) continue;

        const senderId = String(event.sender?.id ?? "");
        const text     = String(event.message.text ?? "");

        await (db as any).lead.create({
          data: {
            source:   "INSTAGRAM",
            name:     null,
            phone:    null,
            province: null,
            message:  text,
            status:   "NEW",
            metadata: { instagramSenderId: senderId, raw: event },
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("[leads/webhook/instagram]", e);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
