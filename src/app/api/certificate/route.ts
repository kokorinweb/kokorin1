import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { notifyCertificateRequest } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  amount: z.number().int().min(1000).max(200_000),
  name: z.string().trim().min(2).max(60),
  phone: z
    .string()
    .trim()
    .min(10)
    .max(20)
    .regex(/^[+\d][\d\s()\-]+$/, "Телефон выглядит некорректно"),
});

/** Заявка на сертификат. Оплаты нет — это именно заявка, менеджер перезванивает. */
export async function POST(request: Request) {
  if (!rateLimit(`cert:${clientIp(request)}`, 4, 60_000)) {
    return NextResponse.json({ error: "Слишком много заявок подряд" }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте сумму и контакты" }, { status: 400 });
  }

  try {
    await notifyCertificateRequest(parsed.data);
  } catch (error) {
    console.error("[api/certificate] уведомление не ушло:", error);
  }

  return NextResponse.json({ ok: true });
}
