import { NextResponse } from "next/server";
import { z } from "zod";
import { aiConfigured, askAssistant } from "@/lib/ai";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { RESTAURANT } from "@/lib/restaurant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      }),
    )
    .min(1)
    .max(20),
});

export async function POST(request: Request) {
  if (!aiConfigured()) {
    return NextResponse.json(
      { error: `ИИ-консультант временно недоступен. Позвоните нам: ${RESTAURANT.phone}` },
      { status: 503 },
    );
  }

  if (!rateLimit(`chat:${clientIp(request)}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "Слишком много сообщений подряд. Подождите минуту." },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  // Историю присылает клиент, поэтому последнее слово всегда должно быть за гостем.
  const messages = parsed.data.messages.filter((message, index, all) =>
    index === all.length - 1 ? message.role === "user" : true,
  );
  if (messages.at(-1)?.role !== "user") {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  try {
    const reply = await askAssistant(messages, "web");
    return NextResponse.json(reply);
  } catch (error) {
    console.error("[api/chat] ошибка ассистента:", error);
    return NextResponse.json(
      { error: `Помощник не ответил. Попробуйте ещё раз или позвоните: ${RESTAURANT.phone}` },
      { status: 502 },
    );
  }
}
