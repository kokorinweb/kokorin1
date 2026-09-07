import { Bot, InlineKeyboard } from "grammy";
import { CATEGORIES, formatPrice, itemsByCategory, portionLabel, type CategoryId } from "./menu";
import { RESTAURANT, siteUrl } from "./restaurant";
import { askAssistant, aiConfigured, type ChatMessage } from "./ai";
import { formatDateKey, zoneById, type Booking } from "./booking";
import type { OrderInput, PricedOrder } from "./order";

export function botConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

function token(): string {
  const value = process.env.TELEGRAM_BOT_TOKEN;
  if (!value) throw new Error("TELEGRAM_BOT_TOKEN не задан");
  return value;
}

/**
 * История диалога живёт в памяти процесса.
 * Этого хватает для одного инстанса; на нескольких репликах или в serverless
 * контекст будет теряться — тогда историю нужно вынести в Redis/KV.
 */
const HISTORY_LIMIT = 12;
const history = new Map<number, ChatMessage[]>();

function remember(chatId: number, message: ChatMessage): ChatMessage[] {
  const thread = history.get(chatId) ?? [];
  thread.push(message);
  const trimmed = thread.slice(-HISTORY_LIMIT);
  history.set(chatId, trimmed);
  return trimmed;
}

const WELCOME = `Это бот ресторана «${RESTAURANT.name}» 🍣

Я — Кай, ИИ-консультант. Спросите что угодно: что взять на двоих, из чего ролл, есть ли свободный стол в пятницу вечером. Свободное время я смотрю по-настоящему, а не выдумываю.

Бронь и корзина — на сайте, там же схема зала.`;

function mainKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Меню", "menu")
    .text("Часы работы", "hours")
    .row()
    .url("Забронировать стол", `${siteUrl()}/booking`)
    .url("Собрать заказ", `${siteUrl()}/menu`);
}

function categoryText(category: CategoryId): string {
  const meta = CATEGORIES.find((row) => row.id === category);
  const lines = itemsByCategory(category).map(
    (item) => `• ${item.name} — ${formatPrice(item.price)} (${portionLabel(item)})`,
  );
  return `<b>${meta?.title} · ${meta?.subtitle}</b>\n\n${lines.join("\n")}`;
}

function visitText(): string {
  return `<b>Как к нам попасть</b>

🍱 Столик — бронь на сайте: ${siteUrl()}/booking
Бесплатно, без предоплаты, стол держим 20 минут.
После брони можно заказать блюда заранее — подадим через ${RESTAURANT.preorder.leadMinutes} минут после прихода.

🥡 Самовывоз: готовность ${RESTAURANT.pickup.etaMinutes} минут, скидка ${RESTAURANT.pickup.discountPercent}%.

Доставки у нас нет — возим только вкус на месте.
📍 ${RESTAURANT.address}`;
}

function hoursText(): string {
  const rows = RESTAURANT.hours.map((row) => `• ${row.days} — ${row.time}`).join("\n");
  return `<b>Часы работы</b>\n${rows}\n\n📍 ${RESTAURANT.address}\n🚇 ${RESTAURANT.metro}\n📞 ${RESTAURANT.phone}`;
}

let cached: Bot | null = null;

/** Собирает бота со всеми хендлерами. Один и тот же объект для polling и webhook. */
export function createBot(): Bot {
  if (cached) return cached;

  const bot = new Bot(token());

  bot.command("start", (ctx) => ctx.reply(WELCOME, { reply_markup: mainKeyboard() }));
  bot.command("menu", (ctx) => ctx.reply("Что посмотрим?", { reply_markup: menuKeyboard() }));
  bot.command("book", (ctx) =>
    ctx.reply(visitText(), {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().url("Открыть схему зала", `${siteUrl()}/booking`),
    }),
  );
  bot.command("hours", (ctx) => ctx.reply(hoursText(), { parse_mode: "HTML" }));
  bot.command("contacts", (ctx) =>
    ctx.reply(
      `📍 ${RESTAURANT.address}\n🚇 ${RESTAURANT.metro}\n📞 ${RESTAURANT.phone}\n✉️ ${RESTAURANT.email}`,
    ),
  );
  bot.command("reset", (ctx) => {
    history.delete(ctx.chat.id);
    return ctx.reply("Контекст диалога очищен. Спрашивайте заново.");
  });

  bot.callbackQuery("menu", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply("Выберите раздел:", { reply_markup: menuKeyboard() });
  });
  bot.callbackQuery("hours", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(hoursText(), { parse_mode: "HTML" });
  });

  bot.callbackQuery(/^cat:(.+)$/, async (ctx) => {
    const category = ctx.match[1] as CategoryId;
    await ctx.answerCallbackQuery();
    if (!CATEGORIES.some((row) => row.id === category)) return;
    await ctx.reply(categoryText(category), { parse_mode: "HTML" });
  });

  bot.on("message:text", async (ctx) => {
    const question = ctx.message.text.trim();
    if (!question) return;

    if (!aiConfigured()) {
      await ctx.reply(
        `ИИ-консультант сейчас недоступен. Меню — командой /menu, бронь — ${siteUrl()}/booking, телефон: ${RESTAURANT.phone}`,
      );
      return;
    }

    await ctx.replyWithChatAction("typing");
    const thread = remember(ctx.chat.id, { role: "user", content: question });

    try {
      const reply = await askAssistant(thread, "telegram");
      const text = reply.text || `Не уверен, что понял вопрос. Позвоните нам: ${RESTAURANT.phone}`;
      remember(ctx.chat.id, { role: "assistant", content: text });
      await ctx.reply(text);
    } catch (error) {
      console.error("[telegram] ошибка ассистента:", error);
      // Неудачный вопрос не должен отравлять контекст следующего.
      const thread = history.get(ctx.chat.id);
      if (thread) history.set(ctx.chat.id, thread.slice(0, -1));
      await ctx.reply(
        `Извините, не смог ответить. Попробуйте ещё раз или позвоните: ${RESTAURANT.phone}`,
      );
    }
  });

  bot.catch((error) => console.error("[telegram] необработанная ошибка:", error));

  cached = bot;
  return bot;
}

function menuKeyboard(): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  CATEGORIES.forEach((category, index) => {
    keyboard.text(category.title, `cat:${category.id}`);
    if (index % 2 === 1) keyboard.row();
  });
  keyboard.row().url("Собрать заказ на сайте", `${siteUrl()}/menu`);
  return keyboard;
}

export const BOT_COMMANDS = [
  { command: "start", description: "Начать" },
  { command: "menu", description: "Меню по разделам" },
  { command: "book", description: "Бронь столика и самовывоз" },
  { command: "hours", description: "Часы работы" },
  { command: "contacts", description: "Контакты и адрес" },
  { command: "reset", description: "Очистить контекст диалога" },
];

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendToWorkChat(text: string): Promise<void> {
  const chatId = process.env.TELEGRAM_ORDERS_CHAT_ID;
  if (!chatId || !botConfigured()) {
    console.warn("[telegram] уведомление не отправлено: нет токена или chat id");
    return;
  }
  await createBot().api.sendMessage(chatId, text, { parse_mode: "HTML" });
}

/** Отправляет новый заказ с сайта в рабочий чат ресторана. */
export async function notifyNewOrder(
  orderNumber: string,
  input: OrderInput,
  priced: PricedOrder,
): Promise<void> {
  const lines = priced.lines
    .map(
      (line) => `• ${escapeHtml(line.item.name)} × ${line.quantity} — ${formatPrice(line.lineTotal)}`,
    )
    .join("\n");

  const parts = [
    `<b>🧾 Новый заказ ${escapeHtml(orderNumber)}</b>`,
    "",
    lines,
    "",
    `Сумма: ${formatPrice(priced.subtotal)}`,
  ];
  if (priced.discount) parts.push(`Скидка за самовывоз: −${formatPrice(priced.discount)}`);
  parts.push(`<b>Итого: ${formatPrice(priced.total)}</b>`, "");

  if (input.fulfillment === "pickup") {
    parts.push(`🥡 Самовывоз к ${escapeHtml(input.pickupTime ?? "—")}`);
  } else {
    parts.push(
      `🍱 К столику по броне ${escapeHtml(input.bookingCode ?? "—")}`,
      `Подать к ${escapeHtml(input.serveTime ?? "—")}`,
    );
  }

  parts.push(`👤 ${escapeHtml(input.name)}`, `📞 ${escapeHtml(input.phone)}`);
  if (input.comment) parts.push(`💬 ${escapeHtml(input.comment)}`);

  await sendToWorkChat(parts.join("\n"));
}

/** Отправляет новую бронь в рабочий чат — хостес видит её раньше, чем гость доедет. */
export async function notifyNewBooking(booking: Booking): Promise<void> {
  const parts = [
    `<b>🪑 Новая бронь ${escapeHtml(booking.code)}</b>`,
    "",
    `📅 ${formatDateKey(booking.dateKey)}, ${booking.slot}`,
    `👥 ${booking.guests}`,
    `🪑 Стол №${booking.tableId} · ${zoneById(booking.zone).title}`,
    `👤 ${escapeHtml(booking.name)}`,
    `📞 ${escapeHtml(booking.phone)}`,
  ];
  if (booking.comment) parts.push(`💬 ${escapeHtml(booking.comment)}`);

  await sendToWorkChat(parts.join("\n"));
}

/** Заявка на подарочный сертификат — уходит менеджеру, оплату он выставляет сам. */
export async function notifyCertificateRequest(input: {
  amount: number;
  name: string;
  phone: string;
}): Promise<void> {
  await sendToWorkChat(
    [
      "<b>🎁 Заявка на сертификат</b>",
      "",
      `Номинал: ${formatPrice(input.amount)}`,
      `👤 ${escapeHtml(input.name)}`,
      `📞 ${escapeHtml(input.phone)}`,
    ].join("\n"),
  );
}
