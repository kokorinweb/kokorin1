/**
 * Телефон — это ключ клиента в CRM, поэтому он должен быть один и тот же
 * независимо от того, как его набрали в форме: +7 (495) 123-45-67, 84951234567
 * и 4951234567 — один и тот же человек, а не три разных.
 */

/** Приводит российский номер к виду +74951234567. Всё непонятное оставляет как есть, только чистит мусор. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");

  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    return `+7${digits.slice(1)}`;
  }
  if (digits.length === 10) {
    return `+7${digits}`;
  }
  // Иностранный или заведомо кривой номер: сохраняем цифры, не выдумываем код страны.
  return digits ? `+${digits}` : raw.trim();
}

/** Читаемый вид для таблиц и карточек: +7 (495) 123-45-67. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 11) return phone;
  return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
}
