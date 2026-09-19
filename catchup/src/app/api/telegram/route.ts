import { webhookCallback } from "grammy";
import { createBot } from "@/bot/bot";
import { WEBHOOK_SECRET, botConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

declare global {
  var __catchupHandler: ((request: Request) => Promise<Response>) | undefined;
}

function handler() {
  globalThis.__catchupHandler ??= webhookCallback(createBot(), "std/http", {
    secretToken: WEBHOOK_SECRET || undefined,
  });
  return globalThis.__catchupHandler;
}

export async function POST(request: Request): Promise<Response> {
  if (!botConfigured()) {
    return new Response("bot not configured", { status: 503 });
  }
  try {
    return await handler()(request);
  } catch (error) {
    // Отдать 200 важнее, чем пожаловаться: на 5xx Телеграм будет слать
    // тот же апдейт снова и снова, пока не выключит вебхук.
    console.error("[webhook]", error);
    return new Response("ok", { status: 200 });
  }
}
