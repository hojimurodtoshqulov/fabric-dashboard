import { type NextRequest } from "next/server";
import { telegramProvider } from "@/lib/messaging/telegram";
import { apiSuccess, apiError } from "@/lib/utils/api";
import { config } from "@/config";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== config.telegram.webhookSecret) {
    return apiError("Unauthorized", 401);
  }

  const body = await req.json();
  const result = await telegramProvider.processWebhook(body);
  return apiSuccess(result);
}
