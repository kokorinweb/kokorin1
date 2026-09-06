/**
 * Примитивный лимитер в памяти процесса.
 * Защищает от случайного залипания кнопки и от одного скучающего школьника,
 * но не от распределённой атаки: на нескольких инстансах счётчики не общие.
 * Для продакшена заменить на Redis/Upstash.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((time) => now - time < windowMs);

  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }

  hits.push(now);
  buckets.set(key, hits);

  // Не даём карте расти бесконечно.
  if (buckets.size > 5000) {
    for (const [bucketKey, times] of buckets) {
      if (times.every((time) => now - time >= windowMs)) buckets.delete(bucketKey);
    }
  }

  return true;
}

/** Лучшая доступная догадка об адресе клиента за прокси. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
