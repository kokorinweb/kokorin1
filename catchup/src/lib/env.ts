/** Всё, что приходит из окружения, читается только здесь. */

export const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
export const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
export const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? "";

/**
 * Модель по умолчанию — Opus 5. Она дороже ($5/$25 за 1M токенов), но качество
 * сводки — это и есть продукт. Переключение на claude-sonnet-5 ($2/$10) или
 * claude-haiku-4-5 ($1/$5) — осознанное решение владельца, а не умолчание.
 */
export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

export const DB_PATH = process.env.CATCHUP_DB_PATH ?? "./data/catchup.db";

/** Сколько суток храним чужие сообщения. Меньше — спокойнее спится. */
export const RETENTION_DAYS = Number(process.env.CATCHUP_RETENTION_DAYS ?? 14);

/** Потолок символов транскрипта на один запрос — прямой потолок счёта за токены. */
export const MAX_TRANSCRIPT_CHARS = Number(process.env.CATCHUP_MAX_CHARS ?? 120_000);

/** Потолок сообщений на один запрос. */
export const MAX_TRANSCRIPT_MESSAGES = Number(process.env.CATCHUP_MAX_MESSAGES ?? 1200);

/** Сколько входных токенов в сутки может сжечь один чат. Защита от разорения. */
export const DAILY_TOKEN_CAP = Number(process.env.CATCHUP_DAILY_TOKEN_CAP ?? 400_000);

export const PUBLIC_URL = process.env.CATCHUP_PUBLIC_URL ?? "http://localhost:3000";

export function aiConfigured(): boolean {
  return ANTHROPIC_KEY.length > 0;
}

export function botConfigured(): boolean {
  return BOT_TOKEN.length > 0;
}
