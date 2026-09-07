import { NextResponse } from "next/server";
import { OrderError, makeOrderNumber, orderSchema, priceOrder } from "@/lib/order";
import { notifyNewOrder } from "@/lib/telegram";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!rateLimit(`order:${clientIp(request)}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "Слишком много попыток. Подождите минуту или позвоните нам." },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = orderSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "Проверьте поля формы" }, { status: 400 });
  }

  const input = parsed.data;

  let priced;
  try {
    // Цены и суммы считает сервер по MENU: то, что прислал браузер, значения не имеет.
    priced = priceOrder(input);
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const orderNumber = makeOrderNumber();

  try {
    await notifyNewOrder(orderNumber, input, priced);
  } catch (error) {
    // Заказ уже принят логически; падать из-за телеграма нельзя, но знать надо.
    console.error("[api/order] не удалось отправить уведомление в Telegram:", error);
  }

  console.info(
    `[api/order] ${orderNumber} · ${priced.fulfillment} · ${priced.total} ₽ · ${priced.lines.length} поз.`,
  );

  return NextResponse.json({
    orderNumber,
    total: priced.total,
    subtotal: priced.subtotal,
    discount: priced.discount,
    etaMinutes: priced.etaMinutes,
  });
}
