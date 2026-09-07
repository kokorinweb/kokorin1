/**
 * Бронирование столиков: залы, столы, слоты и правила.
 *
 * ВАЖНО про хранилище. Подтверждённые брони лежат в памяти процесса (`bookings`),
 * а «фоновая» занятость зала считается детерминированной функцией от даты и стола
 * (`demoOccupancy`) — чтобы схема зала выглядела живой без базы данных.
 * Для продакшена меняется ровно одно место: `loadBookings`/`saveBooking` уходят
 * в Postgres/Redis, а `demoOccupancy` удаляется целиком.
 */

import { z } from "zod";
import { RESTAURANT, hoursForDay } from "./restaurant";

export type ZoneId = "main" | "window" | "bar" | "vip" | "terrace";

export type Zone = {
  id: ZoneId;
  title: string;
  jp: string;
  description: string;
  /** Наценка за зону, ₽. Ноль — значит бесплатно, так и пишем гостю. */
  surcharge: number;
};

export const ZONES: Zone[] = [
  {
    id: "main",
    title: "Основной зал",
    jp: "本席",
    description: "Тихий свет, мягкие диваны, вид на открытую кухню.",
    surcharge: 0,
  },
  {
    id: "window",
    title: "У окна",
    jp: "窓際",
    description: "Панорамные окна на Малую Бронную. Лучшие места на закате.",
    surcharge: 0,
  },
  {
    id: "bar",
    title: "Бар",
    jp: "カウンター",
    description: "Стойка напротив шефа: видно, как собирают каждый ролл.",
    surcharge: 0,
  },
  {
    id: "vip",
    title: "VIP-комната",
    jp: "個室",
    description: "Отдельная комната с раздвижной дверью сёдзи. Депозит 5 000 ₽.",
    surcharge: 5000,
  },
  {
    id: "terrace",
    title: "Терраса",
    jp: "テラス",
    description: "Открыта с мая по октябрь, есть пледы и обогреватели.",
    surcharge: 0,
  },
];

export type Table = {
  id: number;
  zone: ZoneId;
  seats: number;
  /** Координаты на схеме зала, в процентах от ширины/высоты SVG. */
  x: number;
  y: number;
  shape: "round" | "square" | "bar" | "booth";
};

/** Схема зала. Порядок влияет только на подсказку «ближайший свободный». */
export const TABLES: Table[] = [
  // Основной зал — центр схемы
  { id: 1, zone: "main", seats: 2, x: 34, y: 30, shape: "round" },
  { id: 2, zone: "main", seats: 2, x: 46, y: 30, shape: "round" },
  { id: 3, zone: "main", seats: 4, x: 34, y: 48, shape: "square" },
  { id: 4, zone: "main", seats: 4, x: 46, y: 48, shape: "square" },
  { id: 5, zone: "main", seats: 6, x: 40, y: 66, shape: "square" },
  { id: 6, zone: "main", seats: 4, x: 55, y: 66, shape: "square" },
  // У окна — левая стена
  { id: 7, zone: "window", seats: 2, x: 13, y: 26, shape: "booth" },
  { id: 8, zone: "window", seats: 2, x: 13, y: 42, shape: "booth" },
  { id: 9, zone: "window", seats: 4, x: 13, y: 58, shape: "booth" },
  { id: 10, zone: "window", seats: 4, x: 13, y: 74, shape: "booth" },
  // Бар — верхняя стойка
  { id: 11, zone: "bar", seats: 1, x: 62, y: 16, shape: "bar" },
  { id: 12, zone: "bar", seats: 1, x: 70, y: 16, shape: "bar" },
  { id: 13, zone: "bar", seats: 2, x: 78, y: 16, shape: "bar" },
  { id: 14, zone: "bar", seats: 2, x: 86, y: 16, shape: "bar" },
  // VIP — правый нижний угол
  { id: 15, zone: "vip", seats: 8, x: 79, y: 46, shape: "square" },
  { id: 16, zone: "vip", seats: 6, x: 79, y: 66, shape: "square" },
  // Терраса — нижняя полоса
  { id: 17, zone: "terrace", seats: 2, x: 26, y: 88, shape: "round" },
  { id: 18, zone: "terrace", seats: 4, x: 42, y: 88, shape: "round" },
  { id: 19, zone: "terrace", seats: 4, x: 58, y: 88, shape: "round" },
  { id: 20, zone: "terrace", seats: 6, x: 74, y: 88, shape: "round" },
];

export const MAX_GUESTS = 12;
export const MIN_GUESTS = 1;
/** Сколько столик держится за гостем. Влияет на пересечение броней. */
export const HOLD_MINUTES = 120;
/** На сколько дней вперёд открыта запись. */
export const BOOKING_HORIZON_DAYS = 30;
/** Насколько заранее можно забронировать на сегодня. */
export const MIN_LEAD_MINUTES = 60;

const MOSCOW_OFFSET_MINUTES = 180;

/** Текущее время в Москве, как «наивная» дата (часы/минуты уже московские). */
export function moscowNow(): Date {
  const now = new Date();
  return new Date(now.getTime() + (MOSCOW_OFFSET_MINUTES + now.getTimezoneOffset()) * 60_000);
}

/** «2026-09-07» — ключ дня, в котором живёт вся логика броней. */
export function toDateKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

const WEEKDAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

/** «7 сентября, пн» — то, что видит гость. */
export function formatDateKey(key: string): string {
  const date = parseDateKey(key);
  if (!date) return key;
  return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${WEEKDAYS[date.getDay()]}`;
}

/** Ближайшие дни для выбора даты: сегодня + горизонт. */
export function availableDates(count = BOOKING_HORIZON_DAYS): {
  key: string;
  day: number;
  weekday: string;
  month: string;
  isToday: boolean;
}[] {
  const start = moscowNow();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return {
      key: toDateKey(date),
      day: date.getDate(),
      weekday: WEEKDAYS[date.getDay()],
      month: MONTHS[date.getMonth()].slice(0, 3),
      isToday: index === 0,
    };
  });
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function fromMinutes(total: number): string {
  const normalized = ((total % 1440) + 1440) % 1440;
  const hours = `${Math.floor(normalized / 60)}`.padStart(2, "0");
  const minutes = `${normalized % 60}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Слоты бронирования на конкретную дату, шаг 30 минут.
 * Последний слот — за 90 минут до закрытия: раньше гость просто не успеет поесть.
 */
export function slotsForDate(dateKey: string): string[] {
  const date = parseDateKey(dateKey);
  if (!date) return [];

  const hours = hoursForDay(date.getDay());
  const open = toMinutes(hours.open);
  const closeRaw = toMinutes(hours.close);
  // Закрытие после полуночи (01:00) — это следующие сутки.
  const close = closeRaw <= open ? closeRaw + 1440 : closeRaw;
  const last = close - 90;

  const slots: string[] = [];
  for (let minute = open; minute <= last; minute += 30) {
    slots.push(fromMinutes(minute));
  }
  return slots;
}

/** Слот уже прошёл (или до него меньше часа)? Считаем только для сегодняшней даты. */
export function isSlotInPast(dateKey: string, slot: string): boolean {
  const now = moscowNow();
  if (dateKey !== toDateKey(now)) return false;
  const slotMinutes = toMinutes(slot);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  // Ночные слоты (00:00, 00:30) относятся к следующим суткам.
  const normalized = slotMinutes < toMinutes("06:00") ? slotMinutes + 1440 : slotMinutes;
  return normalized - nowMinutes < MIN_LEAD_MINUTES;
}

// ───────────────────────────── Хранилище броней ─────────────────────────────

export type Booking = {
  code: string;
  dateKey: string;
  slot: string;
  guests: number;
  tableId: number;
  zone: ZoneId;
  name: string;
  phone: string;
  comment: string;
  createdAt: number;
};

/** См. заголовок файла: это память процесса, а не база. */
const bookings = new Map<string, Booking>();

export function findBooking(code: string): Booking | undefined {
  return bookings.get(code.trim().toUpperCase());
}

export function saveBooking(booking: Booking): void {
  bookings.set(booking.code, booking);
}

function bookingsForDate(dateKey: string): Booking[] {
  return [...bookings.values()].filter((booking) => booking.dateKey === dateKey);
}

/**
 * Демонстрационная занятость зала.
 * Детерминированный хэш от (дата, стол, слот): один и тот же день всегда выглядит
 * одинаково, но разные дни отличаются. В проде эта функция удаляется.
 */
function demoOccupancy(dateKey: string, tableId: number, slot: string): boolean {
  const seed = `${dateKey}|${tableId}|${slot}`;
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const value = (hash >>> 0) % 100;

  // Вечер занят сильнее, чем день; VIP и окна разбирают первыми.
  const minute = toMinutes(slot);
  const evening = minute >= toMinutes("18:00") && minute <= toMinutes("21:30");
  const table = TABLES.find((row) => row.id === tableId);
  const premium = table?.zone === "vip" || table?.zone === "window";

  const threshold = (evening ? 45 : 18) + (premium ? 12 : 0);
  return value < threshold;
}

/** Две брони пересекаются, если между ними меньше HOLD_MINUTES. */
function overlaps(slotA: string, slotB: string): boolean {
  const a = toMinutes(slotA);
  const b = toMinutes(slotB);
  return Math.abs(a - b) < HOLD_MINUTES;
}

export type TableAvailability = {
  tableId: number;
  zone: ZoneId;
  seats: number;
  x: number;
  y: number;
  shape: Table["shape"];
  free: boolean;
  /** Стол свободен, но мест меньше, чем гостей. */
  tooSmall: boolean;
};

/** Свободные столы на дату+время. Учитывает и реальные брони, и демо-занятость. */
export function tableAvailability(
  dateKey: string,
  slot: string,
  guests: number,
): TableAvailability[] {
  const taken = bookingsForDate(dateKey).filter((booking) => overlaps(booking.slot, slot));
  const takenIds = new Set(taken.map((booking) => booking.tableId));

  return TABLES.map((table) => {
    const free = !takenIds.has(table.id) && !demoOccupancy(dateKey, table.id, slot);
    return {
      tableId: table.id,
      zone: table.zone,
      seats: table.seats,
      x: table.x,
      y: table.y,
      shape: table.shape,
      free,
      tooSmall: table.seats < guests,
    };
  });
}

/** Есть ли хоть один подходящий стол в этом слоте — для подсветки времени. */
export function slotHasSpace(dateKey: string, slot: string, guests: number): boolean {
  if (isSlotInPast(dateKey, slot)) return false;
  return tableAvailability(dateKey, slot, guests).some(
    (table) => table.free && !table.tooSmall,
  );
}

export type SlotState = { slot: string; available: boolean };

export function slotStates(dateKey: string, guests: number): SlotState[] {
  return slotsForDate(dateKey).map((slot) => ({
    slot,
    available: slotHasSpace(dateKey, slot, guests),
  }));
}

// ───────────────────────────── Валидация ─────────────────────────────

export class BookingError extends Error {}

export const phoneSchema = z
  .string()
  .trim()
  .min(10, "Укажите телефон")
  .max(20)
  .regex(/^[+\d][\d\s()\-]+$/, "Телефон выглядит некорректно");

export const bookingSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Выберите дату"),
  slot: z.string().regex(/^\d{2}:\d{2}$/, "Выберите время"),
  guests: z.number().int().min(MIN_GUESTS).max(MAX_GUESTS),
  tableId: z.number().int().positive(),
  name: z.string().trim().min(2, "Укажите имя").max(60),
  phone: phoneSchema,
  comment: z.string().trim().max(500).optional().default(""),
});

export type BookingInput = z.infer<typeof bookingSchema>;

/** Полная серверная проверка. Клиенту верить нельзя: он присылает только выбор. */
export function validateBooking(input: BookingInput): Table {
  const date = parseDateKey(input.dateKey);
  if (!date) throw new BookingError("Некорректная дата");

  const today = moscowNow();
  const horizon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + BOOKING_HORIZON_DAYS);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (date < startOfToday) throw new BookingError("Эта дата уже прошла");
  if (date > horizon) {
    throw new BookingError(`Бронируем не больше чем на ${BOOKING_HORIZON_DAYS} дней вперёд`);
  }

  if (!slotsForDate(input.dateKey).includes(input.slot)) {
    throw new BookingError("В это время мы не принимаем гостей");
  }
  if (isSlotInPast(input.dateKey, input.slot)) {
    throw new BookingError(
      `На сегодня бронируем минимум за ${MIN_LEAD_MINUTES} минут. Позвоните: ${RESTAURANT.phone}`,
    );
  }

  const table = TABLES.find((row) => row.id === input.tableId);
  if (!table) throw new BookingError("Такого стола нет");
  if (table.seats < input.guests) {
    throw new BookingError(`Стол №${table.id} рассчитан на ${table.seats} гостей`);
  }

  const availability = tableAvailability(input.dateKey, input.slot, input.guests);
  const state = availability.find((row) => row.tableId === input.tableId);
  if (!state?.free) {
    throw new BookingError("Этот стол только что заняли. Выберите другой — схема уже обновлена.");
  }

  return table;
}

/** Короткий читаемый код брони: NORI-8F3K. */
export function makeBookingCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let tail = "";
  for (let index = 0; index < 4; index += 1) {
    tail += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `NORI-${tail}`;
}

export function zoneById(id: ZoneId): Zone {
  return ZONES.find((zone) => zone.id === id) ?? ZONES[0];
}

/** Варианты времени подачи предзаказа: от времени брони и дальше с шагом 15 минут. */
export function serveTimes(slot: string): string[] {
  const base = toMinutes(slot);
  const { leadMinutes, maxOffsetMinutes } = RESTAURANT.preorder;
  const times: string[] = [];
  for (let offset = leadMinutes; offset <= maxOffsetMinutes; offset += 15) {
    times.push(fromMinutes(base + offset));
  }
  return times;
}

/**
 * Время, на которое можно записать самовывоз: от «сейчас + время готовки»
 * и до закрытия кухни, шаг 15 минут. Если сегодня уже поздно — список пуст,
 * и корзина честно скажет, что заказ примут завтра.
 */
export function pickupTimes(): string[] {
  const now = moscowNow();
  const hours = hoursForDay(now.getDay());
  const open = toMinutes(hours.open);
  const closeRaw = toMinutes(hours.close);
  const close = closeRaw <= open ? closeRaw + 1440 : closeRaw;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const earliest = Math.max(open, nowMinutes + RESTAURANT.pickup.etaMinutes);
  // Кухня перестаёт отдавать навынос за полчаса до закрытия.
  const latest = close - 30;

  const times: string[] = [];
  const start = Math.ceil(earliest / 15) * 15;
  for (let minute = start; minute <= latest; minute += 15) {
    times.push(fromMinutes(minute));
  }
  return times;
}
