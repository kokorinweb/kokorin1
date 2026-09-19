/**
 * Телеграм не сообщает часовой пояс чата, поэтому он хранится в настройках чата
 * и правится командой. Всё внутри живёт в UTC-секундах, смещение применяется
 * только на границах: когда считаем «сегодня» и когда печатаем время.
 */

export function dayKey(atSeconds: number, tzOffsetMin: number): string {
  const shifted = new Date((atSeconds + tzOffsetMin * 60) * 1000);
  return shifted.toISOString().slice(0, 10);
}

/** Начало текущих суток чата в UTC-секундах. */
export function startOfDay(atSeconds: number, tzOffsetMin: number): number {
  const offset = tzOffsetMin * 60;
  return Math.floor((atSeconds + offset) / 86_400) * 86_400 - offset;
}

export function formatTime(atSeconds: number, tzOffsetMin: number): string {
  const shifted = new Date((atSeconds + tzOffsetMin * 60) * 1000);
  return shifted.toISOString().slice(11, 16);
}

export function formatDayTime(atSeconds: number, tzOffsetMin: number): string {
  const shifted = new Date((atSeconds + tzOffsetMin * 60) * 1000);
  return `${shifted.toISOString().slice(8, 10)}.${shifted.toISOString().slice(5, 7)} ${shifted
    .toISOString()
    .slice(11, 16)}`;
}

/** «2 часа», «3 дня» — для человеческих формулировок в ответах бота. */
export function humanSpan(seconds: number): string {
  const hours = Math.round(seconds / 3600);
  if (hours < 1) return "меньше часа";
  if (hours < 24) return `${hours} ${plural(hours, "час", "часа", "часов")}`;
  const days = Math.round(hours / 24);
  return `${days} ${plural(days, "день", "дня", "дней")}`;
}

export function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
