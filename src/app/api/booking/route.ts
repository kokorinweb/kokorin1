import { NextResponse } from "next/server";
import {
  BookingError,
  MAX_GUESTS,
  MIN_GUESTS,
  bookingSchema,
  makeBookingCode,
  saveBooking,
  serveTimes,
  slotStates,
  tableAvailability,
  validateBooking,
  type Booking,
} from "@/lib/booking";
import { notifyNewBooking } from "@/lib/telegram";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/booking?date=2026-09-07&guests=2          → доступные слоты
 * GET  /api/booking?date=…&guests=2&slot=19:30        → + состояние столов
 *
 * Занятость считает только сервер: клиент рисует то, что ему прислали.
 */
export function GET(request: Request) {
  const url = new URL(request.url);
  const dateKey = url.searchParams.get("date") ?? "";
  const guests = Math.min(
    MAX_GUESTS,
    Math.max(MIN_GUESTS, Number(url.searchParams.get("guests")) || 2),
  );
  const slot = url.searchParams.get("slot");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return NextResponse.json({ error: "Некорректная дата" }, { status: 400 });
  }

  const slots = slotStates(dateKey, guests);

  if (!slot) {
    return NextResponse.json({ slots });
  }
  if (!/^\d{2}:\d{2}$/.test(slot)) {
    return NextResponse.json({ error: "Некорректное время" }, { status: 400 });
  }

  return NextResponse.json({ slots, tables: tableAvailability(dateKey, slot, guests) });
}

export async function POST(request: Request) {
  if (!rateLimit(`booking:${clientIp(request)}`, 6, 60_000)) {
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

  const parsed = bookingSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "Проверьте поля формы" }, { status: 400 });
  }

  let table;
  try {
    // Повторная проверка на сервере: между рисованием схемы и отправкой стол мог уйти.
    table = validateBooking(parsed.data);
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }

  const booking: Booking = {
    code: makeBookingCode(),
    dateKey: parsed.data.dateKey,
    slot: parsed.data.slot,
    guests: parsed.data.guests,
    tableId: table.id,
    zone: table.zone,
    name: parsed.data.name,
    phone: parsed.data.phone,
    comment: parsed.data.comment ?? "",
    createdAt: Date.now(),
  };

  saveBooking(booking);

  try {
    await notifyNewBooking(booking);
  } catch (error) {
    // Бронь уже принята; падать из-за телеграма нельзя, но знать надо.
    console.error("[api/booking] не удалось отправить уведомление:", error);
  }

  console.info(
    `[api/booking] ${booking.code} · ${booking.dateKey} ${booking.slot} · стол ${booking.tableId} · ${booking.guests} гостей`,
  );

  return NextResponse.json({
    code: booking.code,
    dateKey: booking.dateKey,
    slot: booking.slot,
    guests: booking.guests,
    tableId: booking.tableId,
    zone: booking.zone,
    serveFrom: serveTimes(booking.slot)[0],
  });
}
