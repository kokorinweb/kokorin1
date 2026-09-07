import { NextResponse } from "next/server";
import { findBooking, formatDateKey, serveTimes, zoneById } from "@/lib/booking";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/booking/lookup?code=NORI-8F3K
 * Нужен корзине: по коду брони она узнаёт время посадки и допустимые времена подачи.
 * Отдаём только то, что нужно для оформления — без имени и телефона гостя.
 * Перебор кода прикрыт лимитером.
 */
export function GET(request: Request) {
  if (!rateLimit(`lookup:${clientIp(request)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const code = new URL(request.url).searchParams.get("code")?.trim().toUpperCase() ?? "";
  const booking = code ? findBooking(code) : undefined;

  if (!booking) {
    return NextResponse.json({ error: "Бронь с таким кодом не найдена" }, { status: 404 });
  }

  return NextResponse.json({
    code: booking.code,
    dateKey: booking.dateKey,
    dateLabel: formatDateKey(booking.dateKey),
    slot: booking.slot,
    guests: booking.guests,
    tableId: booking.tableId,
    zone: zoneById(booking.zone).title,
    serveTimes: serveTimes(booking.slot),
  });
}
