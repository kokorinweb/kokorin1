import { NextResponse } from "next/server";
import { webhookCallback } from "grammy";
import { botConfigured, createBot } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Точка приёма вебхука Telegram.
 * Ставится один раз:
 *   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://ваш-домен/api/telegram&secret_token=<SECRET>"
 * Локально удобнее polling: npm run bot.
 */
export async function POST(request: Request) {
  if (!botConfigured()) {
    return NextResponse.json({ error: "Бот не настроен" }, { status: 503 });
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    // Без этой проверки вебхук может дёрнуть кто угодно, кто узнал URL.
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const handler = webhookCallback(createBot(), "std/http");
  return handler(request);
}
