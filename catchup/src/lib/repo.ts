import { db, now } from "./db";
import { RETENTION_DAYS } from "./env";
import { dayKey } from "./tz";

export type Chat = {
  id: number;
  title: string;
  type: string;
  tz_offset_min: number;
  added_at: number;
  free_digest_day: string | null;
  paused: number;
};

export type StoredMessage = {
  id: number;
  chat_id: number;
  user_id: number;
  author: string;
  body: string;
  reply_to: string | null;
  at: number;
};

export type User = {
  id: number;
  username: string | null;
  first_name: string;
  credits: number;
  dm_open: number;
  created_at: number;
};

function one<T>(row: unknown): T | null {
  return (row ?? null) as T | null;
}

/* ------------------------------- чаты ---------------------------------- */

export function upsertChat(id: number, title: string, type: string): Chat {
  db()
    .prepare(
      `INSERT INTO chats (id, title, type, added_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title, type = excluded.type`,
    )
    .run(id, title, type, now());
  return getChat(id)!;
}

export function getChat(id: number): Chat | null {
  return one<Chat>(db().prepare(`SELECT * FROM chats WHERE id = ?`).get(id));
}

export function setChatTimezone(id: number, offsetMinutes: number): void {
  db().prepare(`UPDATE chats SET tz_offset_min = ? WHERE id = ?`).run(offsetMinutes, id);
}

export function setChatPaused(id: number, paused: boolean): void {
  db().prepare(`UPDATE chats SET paused = ? WHERE id = ?`).run(paused ? 1 : 0, id);
}

/** Одна бесплатная общая сводка в сутки на чат. Возвращает false, если уже брали. */
export function claimFreeDigest(chat: Chat): boolean {
  const today = dayKey(now(), chat.tz_offset_min);
  if (chat.free_digest_day === today) return false;
  db().prepare(`UPDATE chats SET free_digest_day = ? WHERE id = ?`).run(today, chat.id);
  return true;
}

/* ----------------------------- сообщения -------------------------------- */

export function saveMessage(input: {
  chatId: number;
  tgMessageId: number;
  userId: number;
  author: string;
  body: string;
  replyTo: string | null;
  at: number;
}): void {
  db()
    .prepare(
      `INSERT OR IGNORE INTO messages (chat_id, tg_message_id, user_id, author, body, reply_to, at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.chatId,
      input.tgMessageId,
      input.userId,
      input.author,
      input.body,
      input.replyTo,
      input.at,
    );
}

export function messagesSince(chatId: number, since: number, limit: number): StoredMessage[] {
  // Берём последние `limit` сообщений окна, потом возвращаем в прямом порядке:
  // если чат переполнен, важнее свежий хвост, а не обрезанное начало.
  const rows = db()
    .prepare(
      `SELECT * FROM (
         SELECT * FROM messages WHERE chat_id = ? AND at >= ? ORDER BY at DESC LIMIT ?
       ) ORDER BY at ASC`,
    )
    .all(chatId, since, limit);
  return rows as unknown as StoredMessage[];
}

export function countSince(chatId: number, since: number): number {
  const row = db()
    .prepare(`SELECT COUNT(*) AS n FROM messages WHERE chat_id = ? AND at >= ?`)
    .get(chatId, since) as { n: number } | undefined;
  return row?.n ?? 0;
}

export function purgeOldMessages(): number {
  const cutoff = now() - RETENTION_DAYS * 86_400;
  const result = db().prepare(`DELETE FROM messages WHERE at < ?`).run(cutoff);
  return Number(result.changes);
}

export function forgetChat(chatId: number): number {
  const result = db().prepare(`DELETE FROM messages WHERE chat_id = ?`).run(chatId);
  db().prepare(`DELETE FROM seen WHERE chat_id = ?`).run(chatId);
  return Number(result.changes);
}

/* ---------------------------- пользователи ------------------------------ */

export function upsertUser(id: number, username: string | null, firstName: string): User {
  db()
    .prepare(
      `INSERT INTO users (id, username, first_name, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET username = excluded.username, first_name = excluded.first_name`,
    )
    .run(id, username, firstName, now());
  return getUser(id)!;
}

export function getUser(id: number): User | null {
  return one<User>(db().prepare(`SELECT * FROM users WHERE id = ?`).get(id));
}

export function markDmOpen(id: number): void {
  db().prepare(`UPDATE users SET dm_open = 1 WHERE id = ?`).run(id);
}

export function addCredits(userId: number, amount: number): void {
  db().prepare(`UPDATE users SET credits = credits + ? WHERE id = ?`).run(amount, userId);
}

/** Атомарно списывает кредит. false — значит платить нечем. */
export function spendCredit(userId: number): boolean {
  const result = db()
    .prepare(`UPDATE users SET credits = credits - 1 WHERE id = ? AND credits > 0`)
    .run(userId);
  return Number(result.changes) > 0;
}

export function recordPurchase(
  userId: number,
  chargeId: string,
  stars: number,
  credits: number,
): boolean {
  // Телеграм умеет доставить successful_payment повторно — по charge_id отсекаем дубль.
  const result = db()
    .prepare(
      `INSERT OR IGNORE INTO purchases (user_id, charge_id, stars, credits, at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(userId, chargeId, stars, credits, now());
  return Number(result.changes) > 0;
}

/* ------------------------------ прочтения ------------------------------- */

/**
 * Bot API не отдаёт отметок о прочтении. Единственный честный сигнал «человек
 * был здесь» — его собственное сообщение. От него и считаем «что я пропустил».
 */
export function touchSeen(chatId: number, userId: number, at: number): void {
  db()
    .prepare(
      `INSERT INTO seen (chat_id, user_id, last_at) VALUES (?, ?, ?)
       ON CONFLICT(chat_id, user_id) DO UPDATE SET last_at = MAX(last_at, excluded.last_at)`,
    )
    .run(chatId, userId, at);
}

export function lastSeen(chatId: number, userId: number): number | null {
  const row = db()
    .prepare(`SELECT last_at FROM seen WHERE chat_id = ? AND user_id = ?`)
    .get(chatId, userId) as { last_at: number } | undefined;
  return row?.last_at ?? null;
}

export function chatsForUser(userId: number): Chat[] {
  const rows = db()
    .prepare(
      `SELECT c.* FROM chats c JOIN seen s ON s.chat_id = c.id
       WHERE s.user_id = ? AND c.paused = 0 ORDER BY s.last_at DESC`,
    )
    .all(userId);
  return rows as unknown as Chat[];
}

/* ------------------------------- расход --------------------------------- */

export function recordUsage(
  chatId: number,
  tzOffsetMin: number,
  input: number,
  output: number,
  cacheReads: number,
): void {
  db()
    .prepare(
      `INSERT INTO usage_daily (day, chat_id, input_tokens, output_tokens, cache_reads, calls)
       VALUES (?, ?, ?, ?, ?, 1)
       ON CONFLICT(day, chat_id) DO UPDATE SET
         input_tokens  = input_tokens  + excluded.input_tokens,
         output_tokens = output_tokens + excluded.output_tokens,
         cache_reads   = cache_reads   + excluded.cache_reads,
         calls         = calls + 1`,
    )
    .run(dayKey(now(), tzOffsetMin), chatId, input, output, cacheReads);
}

export function inputTokensToday(chatId: number, tzOffsetMin: number): number {
  const row = db()
    .prepare(`SELECT input_tokens AS n FROM usage_daily WHERE day = ? AND chat_id = ?`)
    .get(dayKey(now(), tzOffsetMin), chatId) as { n: number } | undefined;
  return row?.n ?? 0;
}
