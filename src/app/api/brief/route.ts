import { NextResponse } from "next/server";
import { z } from "zod";
import { aiConfigured, askAssistant, type ChatMessage } from "@/lib/ai";
import { BRIEF_FIELDS, type Brief } from "@/lib/brief";
import { clientIp, rateLimit } from "@/lib/ratelimit";

/** Один ход клиента вместе с тем, что уже собрано: сервер состояния не держит. */
const briefSchema = z.object(
  Object.fromEntries(
    BRIEF_FIELDS.map((field) => [field, z.string().max(400).optional()]),
  ) as Record<(typeof BRIEF_FIELDS)[number], z.ZodOptional<z.ZodString>>,
);

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      }),
    )
    .min(1)
    .max(40),
  brief: briefSchema.default({}),
});

export async function POST(request: Request) {
  if (!aiConfigured()) {
    return NextResponse.json({ error: "assistant_unavailable" }, { status: 503 });
  }

  if (!rateLimit(`brief:${clientIp(request)}`, 20, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const reply = await askAssistant(
      parsed.data.messages as ChatMessage[],
      parsed.data.brief as Brief,
    );
    return NextResponse.json(reply);
  } catch (error) {
    console.error("[brief] ассистент не ответил:", error);
    return NextResponse.json({ error: "assistant_failed" }, { status: 502 });
  }
}
