/**
 * Одно соединение с базой на процесс — и два драйвера за одним интерфейсом.
 *
 *   DATABASE_URL задан  → настоящий Postgres (Neon, Supabase, свой сервер).
 *   DATABASE_URL пустой → PGlite: тот же Postgres, скомпилированный в WASM,
 *                         с файлами в .data/pgdata. Ноль установки для локальной
 *                         разработки и демо.
 *
 * Диалект в обоих случаях один, поэтому запросы писать дважды не нужно.
 *
 * Важное ограничение PGlite: каталог данных держит один процесс.
 * `npm run dev` и `npm run db:seed` одновременно работать не будут — это ожидаемо.
 * Нужен доступ из нескольких процессов или деплой на Vercel — задайте DATABASE_URL.
 */
import { SCHEMA_SQL } from "./schema";

export type Db = {
  kind: "postgres" | "pglite";
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
  /** Всё внутри — одной транзакцией. Заказ без строк или строки без заказа никому не нужны. */
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
};

declare global {
  // Next в dev-режиме перезагружает модули на каждое изменение. Без кеша в
  // globalThis мы бы открывали новое соединение (и новый лок PGlite) каждый раз.
  var __osteriaDb: Promise<Db> | undefined;
}

const PGLITE_DIR = process.env.PGLITE_DIR ?? ".data/pgdata";

async function connectPostgres(url: string): Promise<Db> {
  const { Pool } = await import("pg");
  const pool = new Pool({
    connectionString: url,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
  });

  return {
    kind: "postgres",
    async query<T>(sql: string, params: unknown[] = []) {
      const result = await pool.query(sql, params);
      return result.rows as T[];
    },
    async exec(sql: string) {
      await pool.query(sql);
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>) {
      // Транзакция обязана жить на одном соединении, а не на пуле.
      const client = await pool.connect();
      const scoped: Db = {
        kind: "postgres",
        async query<R>(sql: string, params: unknown[] = []) {
          const result = await client.query(sql, params);
          return result.rows as R[];
        },
        async exec(sql: string) {
          await client.query(sql);
        },
        transaction: (nested) => nested(scoped),
      };

      try {
        await client.query("begin");
        const out = await fn(scoped);
        await client.query("commit");
        return out;
      } catch (error) {
        await client.query("rollback").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

async function connectPglite(): Promise<Db> {
  const [{ PGlite }, { mkdirSync }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("node:fs"),
  ]);

  // PGlite создаёт только последний каталог, а не всю цепочку: .data/pgdata
  // без существующего .data падает с ENOENT.
  mkdirSync(PGLITE_DIR, { recursive: true });

  const pg = await PGlite.create(PGLITE_DIR);

  const db: Db = {
    kind: "pglite",
    async query<T>(sql: string, params: unknown[] = []) {
      const result = await pg.query(sql, params);
      return result.rows as T[];
    },
    async exec(sql: string) {
      await pg.exec(sql);
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>) {
      // У PGlite одно соединение и запросы сериализованы, поэтому begin/commit
      // на нём же безопасны: параллельной транзакции в этом процессе не будет.
      await pg.exec("begin");
      try {
        const out = await fn(db);
        await pg.exec("commit");
        return out;
      } catch (error) {
        await pg.exec("rollback").catch(() => {});
        throw error;
      }
    },
  };

  return db;
}

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL?.trim();
  const db = url ? await connectPostgres(url) : await connectPglite();

  // Схема идемпотентна, применяем один раз на процесс.
  await db.exec(SCHEMA_SQL);

  if (!url) {
    console.info(`[db] PGlite, данные в ${PGLITE_DIR} (локальный режим, один процесс)`);
  }

  return db;
}

export function getDb(): Promise<Db> {
  if (!globalThis.__osteriaDb) {
    globalThis.__osteriaDb = connect().catch((error) => {
      // Иначе неудачная попытка навсегда останется в кеше и следующий запрос
      // получит ту же ошибку, даже когда база уже поднялась.
      globalThis.__osteriaDb = undefined;
      throw error;
    });
  }
  return globalThis.__osteriaDb;
}

/** Дата из базы: pg отдаёт Date, PGlite может отдать строку. Приводим к одному виду. */
export function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  return new Date(String(value));
}

/** Нарушение уникальности — единственная ошибка базы, которую мы обрабатываем осмысленно. */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
