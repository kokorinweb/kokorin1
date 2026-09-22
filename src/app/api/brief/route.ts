import { NextResponse } from "next/server";
import { briefSchema, formatBrief } from "@/lib/brief";

export const runtime = "nodejs";

/**
 * Приём заявки с сайта.
 *
 * Без TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID заявка пишется в лог сервера и
 * форма всё равно отвечает успехом: сайт должен работать до того, как
 * заведён бот, а не падать из-за отсутствующей переменной окружения.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);

  // Карта не должна расти бесконечно на долгоживущем процессе.
  if (hits.size > 500) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: "Слишком много заявок подряд. Попробуйте позже." },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = briefSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Проверьте поля формы" },
      { status: 422 },
    );
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const text = formatBrief(parsed.data);

  if (!token || !chatId) {
    console.info("[brief] Telegram не настроен, заявка только в логе:\n%s", text);
    return NextResponse.json({ ok: true, delivered: false });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error("[brief] Telegram ответил %s: %s", response.status, await response.text());
      return NextResponse.json(
        { ok: false, error: "Не удалось доставить заявку" },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("[brief] Telegram недоступен", error);
    return NextResponse.json({ ok: false, error: "Не удалось доставить заявку" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, delivered: true });
}
