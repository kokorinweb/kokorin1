/**
 * Вход в админку. Одна общая роль — «сотрудник ресторана».
 *
 * Пользователей в базе нет намеренно: пока в смене три человека, таблица
 * пользователей с ролями и сбросом пароля — это лишний код, который надо
 * поддерживать. Как только их станет десять и понадобится «кто отменил заказ» —
 * заводим таблицу users и логин на каждого.
 *
 * Пароль лежит в ADMIN_PASSWORD. Если переменная не задана, админка ЗАКРЫТА
 * целиком: пустой пароль по умолчанию — это открытая наружу база телефонов
 * и адресов клиентов.
 */
import { createHmac, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "osteria_admin";
const TTL_HOURS = 12;

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD?.trim());
}

function sessionSecret(): string {
  // Отдельный секрет лучше, но и пароля достаточно: сменили пароль —
  // все выданные сессии автоматически стали недействительными.
  const secret = process.env.ADMIN_SESSION_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim();
  if (!secret) throw new Error("ADMIN_PASSWORD не задан");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

/** Сравнение без утечки по времени: иначе пароль можно подобрать по задержке ответа. */
export function passwordMatches(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD?.trim();
  if (!expected) return false;

  const a = createHash("sha256").update(candidate).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export type Session = { expiresAt: Date; id: string };

function parse(token: string | undefined): Session | null {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  if (expected.length !== signature.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: number;
      sid?: string;
    };
    if (!data.exp || data.exp < Date.now()) return null;
    return { expiresAt: new Date(data.exp), id: data.sid ?? "—" };
  } catch {
    return null;
  }
}

/** Текущая сессия или null. Единственная точка, где страницы узнают, что вход есть. */
export async function currentSession(): Promise<Session | null> {
  if (!adminConfigured()) return null;
  const jar = await cookies();
  return parse(jar.get(COOKIE)?.value);
}

export async function startSession(): Promise<void> {
  const exp = Date.now() + TTL_HOURS * 3_600_000;
  const payload = Buffer.from(
    JSON.stringify({ exp, sid: randomBytes(8).toString("hex") }),
    "utf8",
  ).toString("base64url");

  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_HOURS * 3600,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}
