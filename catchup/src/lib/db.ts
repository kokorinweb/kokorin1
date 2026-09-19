import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DB_PATH } from "./env";

/**
 * SQLite из стандартной библиотеки Node — ноль зависимостей, настоящий SQL,
 * файл на диске. Для одного инстанса этого достаточно; когда понадобится
 * несколько реплик, меняется только этот файл.
 */

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS chats (
  id                INTEGER PRIMARY KEY,
  title             TEXT    NOT NULL DEFAULT '',
  type              TEXT    NOT NULL DEFAULT 'group',
  tz_offset_min     INTEGER NOT NULL DEFAULT 180,
  added_at          INTEGER NOT NULL,
  free_digest_day   TEXT,
  paused            INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id       INTEGER NOT NULL,
  tg_message_id INTEGER NOT NULL,
  user_id       INTEGER NOT NULL,
  author        TEXT    NOT NULL,
  body          TEXT    NOT NULL,
  reply_to      TEXT,
  at            INTEGER NOT NULL,
  UNIQUE (chat_id, tg_message_id)
);
CREATE INDEX IF NOT EXISTS idx_messages_window ON messages (chat_id, at);

CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY,
  username   TEXT,
  first_name TEXT    NOT NULL DEFAULT '',
  credits    INTEGER NOT NULL DEFAULT 0,
  dm_open    INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS seen (
  chat_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  last_at INTEGER NOT NULL,
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS purchases (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id   INTEGER NOT NULL,
  charge_id TEXT    NOT NULL UNIQUE,
  stars     INTEGER NOT NULL,
  credits   INTEGER NOT NULL,
  at        INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_daily (
  day           TEXT    NOT NULL,
  chat_id       INTEGER NOT NULL,
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_reads   INTEGER NOT NULL DEFAULT 0,
  calls         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, chat_id)
);
`;

declare global {
  // В dev Next перезагружает модули; без кеша мы бы открывали базу заново на каждый запрос.
  var __catchupDb: DatabaseSync | undefined;
}

function open(): DatabaseSync {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(SCHEMA);
  return db;
}

export function db(): DatabaseSync {
  globalThis.__catchupDb ??= open();
  return globalThis.__catchupDb;
}

export function now(): number {
  return Math.floor(Date.now() / 1000);
}
