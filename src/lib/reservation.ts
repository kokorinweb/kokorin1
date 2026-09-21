/**
 * Брони столиков. Их принимают по телефону, поэтому источник один — менеджер в панели.
 *
 * Жизненный цикл: новая → подтверждена → гость за столом.
 * Отменить можно до посадки; «не пришёл» ставится после подтверждённого времени.
 */
import { z } from "zod";

export const RESERVATION_STATUSES = [
  "new",
  "confirmed",
  "seated",
  "cancelled",
  "no_show",
] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export function isReservationStatus(value: string): value is ReservationStatus {
  return (RESERVATION_STATUSES as readonly string[]).includes(value);
}

export const RESERVATION_META: Record<
  ReservationStatus,
  { label: string; action: string; pill: string; dot: string }
> = {
  new: {
    label: "Новая",
    action: "Вернуть в новые",
    pill: "bg-warn-tint text-warn ring-warn/20",
    dot: "bg-warn",
  },
  confirmed: {
    label: "Подтверждена",
    action: "Подтвердить",
    pill: "bg-blue-tint text-blue-ink ring-blue/20",
    dot: "bg-blue",
  },
  seated: {
    label: "Гость за столом",
    action: "Гость пришёл",
    pill: "bg-accent-tint text-accent-strong ring-accent/20",
    dot: "bg-accent",
  },
  cancelled: {
    label: "Отменена",
    action: "Отменить",
    pill: "bg-tint text-ink-muted ring-line",
    dot: "bg-ink-muted",
  },
  no_show: {
    label: "Не пришёл",
    action: "Не пришёл",
    pill: "bg-gold-tint text-gold-ink ring-gold/25",
    dot: "bg-gold",
  },
};

export function nextReservationStatuses(current: ReservationStatus): ReservationStatus[] {
  const flow: Record<ReservationStatus, ReservationStatus[]> = {
    new: ["confirmed", "cancelled"],
    confirmed: ["seated", "no_show", "cancelled"],
    seated: [],
    cancelled: ["new"],
    no_show: [],
  };
  return flow[current];
}

/** Зоны зала. Подсказка для хостес, а не номер стола: схемы зала у нас нет. */
export const RESERVATION_AREAS = ["Зал", "У окна", "Терраса", "Барная стойка"] as const;

export const reservationSchema = z.object({
  guestName: z.string().trim().min(2, "Укажите имя гостя").max(60),
  phone: z
    .string()
    .trim()
    .min(10, "Укажите телефон")
    .max(20)
    .regex(/^[+\d][\d\s()\-]+$/, "Телефон выглядит некорректно"),
  /** Дата в виде YYYY-MM-DD и время HH:MM — по времени заведения. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Выберите дату"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Выберите время"),
  guests: z.coerce.number().int().min(1, "Хотя бы один гость").max(20, "Больше 20 — это банкет"),
  area: z.string().trim().max(40).optional().default(""),
  comment: z.string().trim().max(400).optional().default(""),
});

export type ReservationInput = z.infer<typeof reservationSchema>;
