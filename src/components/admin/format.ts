/** Форматирование чисел и дат в админке. Держим в одном месте, чтобы всё выглядело одинаково. */
import { RESTAURANT } from "@/lib/restaurant";

export function money(rub: number): string {
  return `${rub.toLocaleString("ru-RU")} ₽`;
}

/** Компактно для осей и плиток: 30к вместо 30 000 — иначе подписи не влезают. */
export function compactMoney(rub: number): string {
  if (Math.abs(rub) >= 1_000_000) return `${(rub / 1_000_000).toFixed(1).replace(".0", "")}М`;
  if (Math.abs(rub) >= 1000) return `${Math.round(rub / 1000)}к`;
  return String(rub);
}

export function percent(value: number): string {
  return `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;
}

const TZ = RESTAURANT.timezone;

/*
 * Два разных пояса, и это не случайность:
 *
 * — Корзины графика SQL уже перевёл во время заведения и вернул как «наивную»
 *   дату. Её форматируем в UTC, иначе браузер гостя из другого пояса сдвинет
 *   её второй раз и 21 сентября станет 20-м.
 * — Настоящие метки времени (когда создан заказ) показываем в поясе ресторана:
 *   менеджер живёт по времени кухни, а не по времени своего ноутбука в отпуске.
 */
const BUCKET_DAY = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});
const DAY = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone: TZ });
const TIME = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});
export function bucketLabel(at: Date, granularity: "hour" | "day"): string {
  return granularity === "hour"
    ? `${String(at.getUTCHours()).padStart(2, "0")}:00`
    : BUCKET_DAY.format(at);
}

export function dayLabel(at: Date): string {
  return DAY.format(at);
}

/** Момент заказа: «21 сен, 19:42». Время — местное для читающего. */
export function moment(at: Date): string {
  return `${DAY.format(at)}, ${TIME.format(at)}`;
}

export function relative(at: Date, now = new Date()): string {
  const minutes = Math.round((now.getTime() - at.getTime()) / 60_000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  return `${Math.floor(hours / 24)} дн назад`;
}
