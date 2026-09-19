/**
 * Проверка логики без обращения к модели: база, окна, кредиты, потолки.
 * Запуск: npm run smoke
 */
import { strict as assert } from "node:assert";
import { rmSync } from "node:fs";

process.env.CATCHUP_DB_PATH = "./data/smoke.db";
rmSync("./data/smoke.db", { force: true });
rmSync("./data/smoke.db-wal", { force: true });
rmSync("./data/smoke.db-shm", { force: true });

const { now } = await import("../src/lib/db");
const repo = await import("../src/lib/repo");
const { buildTranscript } = await import("../src/lib/digest");
const { startOfDay, dayKey, humanSpan } = await import("../src/lib/tz");

let passed = 0;
function ok(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

const CHAT = -1001234567890;
const ANYA = 111;
const BORIS = 222;

console.log("\nбаза и запись");

ok("чат создаётся и обновляет название", () => {
  repo.upsertChat(CHAT, "Рабочий чат", "supergroup");
  repo.upsertChat(CHAT, "Рабочий чат 2.0", "supergroup");
  assert.equal(repo.getChat(CHAT)?.title, "Рабочий чат 2.0");
});

ok("сообщения сохраняются, дубль по tg_message_id игнорируется", () => {
  const at = now() - 3600;
  for (let i = 0; i < 10; i += 1) {
    repo.saveMessage({
      chatId: CHAT, tgMessageId: i, userId: i % 2 ? ANYA : BORIS,
      author: i % 2 ? "Аня" : "Борис", body: `сообщение ${i}`,
      replyTo: i === 5 ? "Аня" : null, at: at + i,
    });
  }
  repo.saveMessage({
    chatId: CHAT, tgMessageId: 3, userId: ANYA, author: "Аня",
    body: "дубль", replyTo: null, at: at + 3,
  });
  assert.equal(repo.countSince(CHAT, 0), 10);
});

console.log("\nокна и время");

ok("startOfDay уважает смещение чата", () => {
  const msk = startOfDay(now(), 180);
  const utc = startOfDay(now(), 0);
  assert.notEqual(msk, utc);
  assert.equal((utc - msk) % 3600, 0);
});

ok("dayKey у полуночи по МСК и по UTC — разные сутки", () => {
  const at = Date.UTC(2026, 0, 15, 22, 30) / 1000;
  assert.equal(dayKey(at, 0), "2026-01-15");
  assert.equal(dayKey(at, 180), "2026-01-16");
});

ok("humanSpan читается по-русски", () => {
  assert.equal(humanSpan(3600 * 2), "2 часа");
  assert.equal(humanSpan(3600 * 5), "5 часов");
  assert.equal(humanSpan(86_400 * 2), "2 дня");
});

console.log("\nтранскрипт");

ok("транскрипт в прямом порядке и помечает ответы", () => {
  const messages = repo.messagesSince(CHAT, 0, 1000);
  const transcript = buildTranscript(messages, 180);
  assert.equal(transcript.used, 10);
  assert.equal(transcript.truncated, false);
  const lines = transcript.text.split("\n");
  assert.match(lines[0]!, /сообщение 0/);
  assert.match(lines[9]!, /сообщение 9/);
  assert.match(transcript.text, /\(→ Аня\)/);
});

ok("при лимите сообщений берётся свежий хвост, а не начало", () => {
  const messages = repo.messagesSince(CHAT, 0, 3);
  assert.equal(messages.length, 3);
  const transcript = buildTranscript(messages, 180);
  assert.match(transcript.text, /сообщение 9/);
  assert.doesNotMatch(transcript.text, /сообщение 0/);
});

console.log("\nбесплатная сводка");

ok("первая сводка в сутки бесплатна, вторая — нет", () => {
  const chat = repo.getChat(CHAT)!;
  assert.equal(repo.claimFreeDigest(chat), true);
  assert.equal(repo.claimFreeDigest(repo.getChat(CHAT)!), false);
});

console.log("\nкредиты");

ok("кредиты списываются и не уходят в минус", () => {
  repo.upsertUser(ANYA, "anya", "Аня");
  repo.addCredits(ANYA, 2);
  assert.equal(repo.spendCredit(ANYA), true);
  assert.equal(repo.spendCredit(ANYA), true);
  assert.equal(repo.spendCredit(ANYA), false);
  assert.equal(repo.getUser(ANYA)?.credits, 0);
});

ok("повторная доставка платежа не начисляет дважды", () => {
  assert.equal(repo.recordPurchase(ANYA, "charge_1", 60, 10), true);
  assert.equal(repo.recordPurchase(ANYA, "charge_1", 60, 10), false);
});

console.log("\nотметка присутствия");

ok("lastSeen двигается только вперёд", () => {
  repo.touchSeen(CHAT, ANYA, 1000);
  repo.touchSeen(CHAT, ANYA, 500);
  assert.equal(repo.lastSeen(CHAT, ANYA), 1000);
  repo.touchSeen(CHAT, ANYA, 2000);
  assert.equal(repo.lastSeen(CHAT, ANYA), 2000);
});

console.log("\nрасход и потолок");

ok("расход накапливается за сутки", () => {
  repo.recordUsage(CHAT, 180, 1000, 200, 0);
  repo.recordUsage(CHAT, 180, 500, 100, 900);
  assert.equal(repo.inputTokensToday(CHAT, 180), 1500);
});

console.log("\nудаление");

ok("forget стирает сообщения и присутствие", () => {
  assert.equal(repo.forgetChat(CHAT), 10);
  assert.equal(repo.countSince(CHAT, 0), 0);
  assert.equal(repo.lastSeen(CHAT, ANYA), null);
});

rmSync("./data/smoke.db", { force: true });
rmSync("./data/smoke.db-wal", { force: true });
rmSync("./data/smoke.db-shm", { force: true });
console.log(`\nвсе ${passed} проверок прошли\n`);
