import { Bot, GrammyError, type Context } from "grammy";
import { BOT_TOKEN, PUBLIC_URL, RETENTION_DAYS, aiConfigured } from "@/lib/env";
import { now } from "@/lib/db";
import { DigestError, buildTranscript, groupDigest, personalDigest } from "@/lib/digest";
import { PACKS, WELCOME_CREDITS, findPack } from "@/lib/money";
import { esc, renderGroup, renderPersonal } from "@/lib/render";
import {
  addCredits,
  claimFreeDigest,
  countSince,
  forgetChat,
  getChat,
  getUser,
  lastSeen,
  markDmOpen,
  messagesSince,
  recordPurchase,
  saveMessage,
  setChatTimezone,
  spendCredit,
  touchSeen,
  upsertChat,
  upsertUser,
} from "@/lib/repo";
import { MAX_TRANSCRIPT_MESSAGES } from "@/lib/env";
import { humanSpan, startOfDay } from "@/lib/tz";

const HTML = { parse_mode: "HTML" as const };

function displayName(from: { first_name?: string; username?: string }): string {
  return from.first_name?.trim() || from.username || "Кто-то";
}

function isGroup(ctx: Context): boolean {
  return ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
}

/* ------------------------------- тексты ---------------------------------- */

const GROUP_HELLO = `Привет. Я делаю сводки этого чата.

<b>/svod</b> — что было сегодня, одной сводкой в чат
<b>/me</b> — персонально: что <i>ты</i> пропустил, приходит в личку

Чтобы я видел сообщения, у меня должен быть выключен privacy mode, а в чате — права на чтение. Если /svod отвечает «нечего пересказывать», дело в этом.

Храню сообщения ${RETENTION_DAYS} дней, потом удаляю. <b>/forget</b> стирает всё прямо сейчас.`;

const PRIVATE_HELLO = `Привет. Я делаю сводки групповых чатов.

Добавь меня в чат, где много болтают, и вызови там <b>/svod</b> — я перескажу, что было за день.

А <b>/me</b> в том же чате пришлёт сюда персональную сводку: где тебя упоминали, на что тебе не ответили, что повисло на тебе.

Первые ${WELCOME_CREDITS} персональных сводки — бесплатно. Дальше <b>/buy</b>.`;

/* ------------------------------ создание --------------------------------- */

export function createBot(): Bot {
  if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN не задан");
  const bot = new Bot(BOT_TOKEN);

  /* Запись сообщений. Стоит первой, чтобы попадало всё, кроме команд. */
  bot.use(async (ctx, next) => {
    const message = ctx.message;
    if (message?.text && ctx.from && isGroup(ctx) && !message.text.startsWith("/")) {
      const chat = upsertChat(ctx.chat!.id, ctx.chat!.title ?? "", ctx.chat!.type);
      if (!chat.paused) {
        upsertUser(ctx.from.id, ctx.from.username ?? null, displayName(ctx.from));
        saveMessage({
          chatId: chat.id,
          tgMessageId: message.message_id,
          userId: ctx.from.id,
          author: displayName(ctx.from),
          body: message.text.slice(0, 4000),
          replyTo: message.reply_to_message?.from
            ? displayName(message.reply_to_message.from)
            : null,
          at: message.date,
        });
        // Команда — это «прошу сводку», а не «я всё прочитал». Поэтому отметку
        // присутствия двигают только обычные сообщения, иначе /me всегда
        // считал бы, что человек только что всё видел, и возвращал пустоту.
        touchSeen(chat.id, ctx.from.id, message.date);
      }
    }
    await next();
  });

  bot.command("start", async (ctx) => {
    if (isGroup(ctx)) {
      upsertChat(ctx.chat.id, ctx.chat.title ?? "", ctx.chat.type);
      await ctx.reply(GROUP_HELLO, HTML);
      return;
    }
    if (!ctx.from) return;
    const existing = getUser(ctx.from.id);
    upsertUser(ctx.from.id, ctx.from.username ?? null, displayName(ctx.from));
    markDmOpen(ctx.from.id);
    if (!existing) addCredits(ctx.from.id, WELCOME_CREDITS);
    await ctx.reply(PRIVATE_HELLO, HTML);
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(isGroup(ctx) ? GROUP_HELLO : PRIVATE_HELLO, HTML);
  });

  /* --------------------------- общая сводка ------------------------------ */

  bot.command("svod", async (ctx) => {
    if (!isGroup(ctx) || !ctx.from) {
      await ctx.reply("Эта команда работает в групповом чате, куда меня добавили.");
      return;
    }
    if (!aiConfigured()) {
      await ctx.reply("Сводки временно недоступны.");
      return;
    }

    const chat = upsertChat(ctx.chat.id, ctx.chat.title ?? "", ctx.chat.type);
    const since = startOfDay(now(), chat.tz_offset_min);
    const total = countSince(chat.id, since);

    if (total < 5) {
      await ctx.reply(
        "Сегодня почти ничего не было — пересказывать нечего.\n\nЕсли чат на самом деле активный, значит я не вижу сообщений: у меня должен быть выключен privacy mode.",
        HTML,
      );
      return;
    }

    // Бесплатно — раз в сутки на чат. Дальше платит тот, кто просит.
    const free = claimFreeDigest(chat);
    if (!free && !spendCredit(ctx.from.id)) {
      await ctx.reply(
        `Бесплатную сводку на сегодня этот чат уже получил.\n\nЕщё одна — с твоего баланса, но он пуст. Пополнить: /buy`,
        HTML,
      );
      return;
    }

    await ctx.replyWithChatAction("typing");
    try {
      const messages = messagesSince(chat.id, since, MAX_TRANSCRIPT_MESSAGES);
      const transcript = buildTranscript(messages, chat.tz_offset_min);
      const digest = await groupDigest(chat, transcript.text, "сегодня");
      await ctx.reply(renderGroup(digest, "сегодня", transcript.used), HTML);
    } catch (error) {
      if (!free) addCredits(ctx.from.id, 1); // не смогли — не берём денег
      await ctx.reply(error instanceof DigestError ? error.message : "Не получилось. Попробуй ещё раз.");
      if (!(error instanceof DigestError)) console.error("[svod]", error);
    }
  });

  /* ------------------------- персональная сводка ------------------------- */

  bot.command("me", async (ctx) => {
    if (!ctx.from) return;
    if (!isGroup(ctx)) {
      await ctx.reply("Вызови /me в групповом чате, который хочешь догнать — сводку пришлю сюда.");
      return;
    }
    if (!aiConfigured()) {
      await ctx.reply("Сводки временно недоступны.");
      return;
    }

    const chat = upsertChat(ctx.chat.id, ctx.chat.title ?? "", ctx.chat.type);
    const user = upsertUser(ctx.from.id, ctx.from.username ?? null, displayName(ctx.from));

    const seenAt = lastSeen(chat.id, ctx.from.id);
    const since = seenAt ?? now() - 86_400;
    const total = countSince(chat.id, since);

    if (total < 3) {
      await ctx.reply("С твоего последнего сообщения тут почти ничего не было.");
      return;
    }
    if (!spendCredit(ctx.from.id)) {
      await ctx.reply(
        `Персональные сводки закончились. Осталось 0.\n\nПополнить — /buy в личке со мной.`,
        HTML,
      );
      return;
    }

    await ctx.replyWithChatAction("typing");
    const span = humanSpan(now() - since);
    try {
      const messages = messagesSince(chat.id, since, MAX_TRANSCRIPT_MESSAGES);
      const transcript = buildTranscript(messages, chat.tz_offset_min);
      const digest = await personalDigest(chat, transcript.text, displayName(ctx.from), span);
      const text = renderPersonal(digest, chat.title || "Чат", span, transcript.used);

      await ctx.api.sendMessage(ctx.from.id, text, HTML);
      markDmOpen(ctx.from.id);
      await ctx.reply(`${esc(displayName(ctx.from))}, отправил в личку.`, HTML);
    } catch (error) {
      addCredits(ctx.from.id, 1);
      if (error instanceof GrammyError && error.error_code === 403) {
        // Телеграм не даёт писать первым: человек должен сам открыть диалог.
        await ctx.reply(
          `Не могу написать тебе в личку — открой диалог и нажми «Начать»: ${PUBLIC_URL}\n\nПотом повтори /me. Кредит на месте.`,
        );
        return;
      }
      await ctx.reply(error instanceof DigestError ? error.message : "Не получилось. Попробуй ещё раз.");
      if (!(error instanceof DigestError)) console.error("[me]", error);
    }
    void user;
  });

  /* ------------------------------ деньги --------------------------------- */

  bot.command("balance", async (ctx) => {
    if (!ctx.from) return;
    const user = upsertUser(ctx.from.id, ctx.from.username ?? null, displayName(ctx.from));
    await ctx.reply(`Персональных сводок осталось: <b>${user.credits}</b>\n\nПополнить — /buy`, HTML);
  });

  bot.command("buy", async (ctx) => {
    if (isGroup(ctx)) {
      await ctx.reply("Покупка — в личке со мной, там Телеграм показывает оплату.");
      return;
    }
    await ctx.reply(
      "Выбери пакет:\n\n" + PACKS.map((p) => `/pack_${p.id} — ${p.title} за ${p.stars} ⭐`).join("\n"),
    );
  });

  for (const pack of PACKS) {
    bot.command(`pack_${pack.id}`, async (ctx) => {
      await ctx.replyWithInvoice(
        pack.title,
        `${pack.credits} персональных сводок «что я пропустил».`,
        pack.id,
        "XTR",
        [{ label: pack.title, amount: pack.stars }],
      );
    });
  }

  bot.on("pre_checkout_query", async (ctx) => {
    const pack = findPack(ctx.preCheckoutQuery.invoice_payload);
    await ctx.answerPreCheckoutQuery(Boolean(pack), pack ? undefined : "Пакет больше недоступен");
  });

  bot.on("message:successful_payment", async (ctx) => {
    const payment = ctx.message.successful_payment;
    const pack = findPack(payment.invoice_payload);
    if (!pack || !ctx.from) return;

    // Телеграм умеет повторить доставку — начисляем только на первый charge_id.
    const fresh = recordPurchase(
      ctx.from.id,
      payment.telegram_payment_charge_id,
      pack.stars,
      pack.credits,
    );
    if (!fresh) return;

    addCredits(ctx.from.id, pack.credits);
    const user = getUser(ctx.from.id);
    await ctx.reply(`Готово. Сводок на балансе: <b>${user?.credits ?? pack.credits}</b>`, HTML);
  });

  /* ---------------------------- настройки -------------------------------- */

  bot.command("tz", async (ctx) => {
    if (!isGroup(ctx)) return;
    const raw = ctx.match.trim();
    const hours = Number(raw);
    if (!raw || !Number.isFinite(hours) || hours < -12 || hours > 14) {
      const chat = getChat(ctx.chat.id);
      await ctx.reply(
        `Часовой пояс чата: UTC${(chat?.tz_offset_min ?? 180) / 60 >= 0 ? "+" : ""}${
          (chat?.tz_offset_min ?? 180) / 60
        }\n\nСменить: /tz 3`,
      );
      return;
    }
    upsertChat(ctx.chat.id, ctx.chat.title ?? "", ctx.chat.type);
    setChatTimezone(ctx.chat.id, Math.round(hours * 60));
    await ctx.reply(`Часовой пояс чата: UTC${hours >= 0 ? "+" : ""}${hours}. От него считаются сутки.`);
  });

  bot.command("forget", async (ctx) => {
    if (!isGroup(ctx) || !ctx.from) return;
    const member = await ctx.getChatMember(ctx.from.id);
    if (member.status !== "creator" && member.status !== "administrator") {
      await ctx.reply("Стирать историю может только админ чата.");
      return;
    }
    const removed = forgetChat(ctx.chat.id);
    await ctx.reply(`Удалил ${removed} сохранённых сообщений этого чата. Дальше пишу с чистого листа.`);
  });

  bot.catch((error) => {
    console.error("[bot]", error.error);
  });

  return bot;
}
