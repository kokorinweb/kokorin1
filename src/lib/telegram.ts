import { Bot, InlineKeyboard } from "grammy";
import { CATEGORIES, formatPrice, itemsByCategory, type CategoryId } from "./menu";
import { RESTAURANT, siteUrl } from "./restaurant";
import { askAssistant, aiConfigured, type ChatMessage } from "./ai";
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

const WELCOME = `Ciao! 👋 Это бот ресторана «${RESTAURANT.name}».

Я — Лука, ИИ-консультант. Спросите меня что угодно: что есть в меню, из чего блюдо, есть ли вегетарианское, как работает доставка. Отвечаю своими словами, а не кнопками.

Заказ собирается на сайте — там же корзина и оформление.`;

function mainKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🍝 Меню", "menu")
    .text("🚚 Доставка", "delivery")
    .row()
    .text("🕐 Часы работы", "hours")
    .url("🛒 Заказать на сайте", siteUrl());
}

function categoryText(category: CategoryId): string {
  const meta = CATEGORIES.find((c) => c.id === category);
  const lines = itemsByCategory(category).map(
    (item) => `• ${item.name} — ${formatPrice(item.price)} (${item.portion})`,
  );
  return `<b>${meta?.title} · ${meta?.subtitle}</b>\n\n${lines.join("\n")}`;
}

function deliveryText(): string {
  const d = RESTAURANT.delivery;
  return `<b>Доставка и самовывоз</b>

🚚 Доставка ${d.zone}
• минимальный заказ — ${formatPrice(d.minOrder)}
• стоимость — ${formatPrice(d.fee)}, бесплатно от ${formatPrice(d.freeFrom)}
• примерно ${d.etaMinutes} минут

🏃 Самовывоз: ${RESTAURANT.pickup.etaMinutes} минут и скидка ${RESTAURANT.pickup.discountPercent}%
📍 ${RESTAURANT.address}`;
}

function hoursText(): string {
  const rows = RESTAURANT.hours.map((h) => `• ${h.days} — ${h.time}`).join("\n");
  return `<b>Часы работы</b>\n${rows}\n\n📍 ${RESTAURANT.address}\n📞 ${RESTAURANT.phone}`;
}

let cached: Bot | null = null;

/** Собирает бота со всеми хендлерами. Один и тот же объект для polling и webhook. */
export function createBot(): Bot {
  if (cached) return cached;

  const bot = new Bot(token());

  bot.command("start", (ctx) =>
    ctx.reply(WELCOME, { reply_markup: mainKeyboard() }),
  );

  bot.command("menu", (ctx) => ctx.reply("Что посмотрим?", { reply_markup: menuKeyboard() }));
  bot.command("delivery", (ctx) => ctx.reply(deliveryText(), { parse_mode: "HTML" }));
  bot.command("hours", (ctx) => ctx.reply(hoursText(), { parse_mode: "HTML" }));
  bot.command("contacts", (ctx) =>
    ctx.reply(
      `📍 ${RESTAURANT.address}\n🚇 ${RESTAURANT.metro}\n📞 ${RESTAURANT.phone}\n✉️ ${RESTAURANT.email}`,
    ),
  );
  bot.command("reset", (ctx) => {
    history.delete(ctx.chat.id);
    return ctx.reply("Контекст диалога очищен. Спрашивайте заново 🙂");
  });

  bot.callbackQuery("menu", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply("Выберите раздел:", { reply_markup: menuKeyboard() });
  });
  bot.callbackQuery("delivery", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(deliveryText(), { parse_mode: "HTML" });
  });
  bot.callbackQuery("hours", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(hoursText(), { parse_mode: "HTML" });
  });

  bot.callbackQuery(/^cat:(.+)$/, async (ctx) => {
    const category = ctx.match[1] as CategoryId;
    await ctx.answerCallbackQuery();
    if (!CATEGORIES.some((c) => c.id === category)) return;
    await ctx.reply(categoryText(category), { parse_mode: "HTML" });
  });

  bot.on("message:text", async (ctx) => {
    const question = ctx.message.text.trim();
    if (!question) return;

    if (!aiConfigured()) {
      await ctx.reply(
        `ИИ-консультант сейчас недоступен. Загляните в меню командой /menu или позвоните: ${RESTAURANT.phone}`,
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
    keyboard.text(`${category.title}`, `cat:${category.id}`);
    if (index % 2 === 1) keyboard.row();
  });
  keyboard.row().url("🛒 Собрать заказ на сайте", siteUrl());
  return keyboard;
}

export const BOT_COMMANDS = [
  { command: "start", description: "Начать" },
  { command: "menu", description: "Меню по разделам" },
  { command: "delivery", description: "Доставка и самовывоз" },
  { command: "hours", description: "Часы работы" },
  { command: "contacts", description: "Контакты и адрес" },
  { command: "reset", description: "Очистить контекст диалога" },
];

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Отправляет новый заказ с сайта в рабочий чат ресторана. */
export async function notifyNewOrder(
  orderNumber: string,
  input: OrderInput,
  priced: PricedOrder,
): Promise<void> {
  const chatId = process.env.TELEGRAM_ORDERS_CHAT_ID;
  if (!chatId || !botConfigured()) {
    console.warn("[telegram] уведомление о заказе не отправлено: нет токена или chat id");
    return;
  }

  const lines = priced.lines
    .map((line) => `• ${escapeHtml(line.item.name)} × ${line.quantity} — ${formatPrice(line.lineTotal)}`)
    .join("\n");

  const parts = [
    `<b>🧾 Новый заказ ${escapeHtml(orderNumber)}</b>`,
    "",
    lines,
    "",
    `Сумма: ${formatPrice(priced.subtotal)}`,
  ];
  if (priced.discount) parts.push(`Скидка за самовывоз: −${formatPrice(priced.discount)}`);
  if (priced.deliveryFee) parts.push(`Доставка: ${formatPrice(priced.deliveryFee)}`);
  parts.push(
    `<b>Итого: ${formatPrice(priced.total)}</b>`,
    "",
    priced.fulfillment === "delivery" ? "🚚 Доставка" : "🏃 Самовывоз",
    `👤 ${escapeHtml(input.name)}`,
    `📞 ${escapeHtml(input.phone)}`,
  );
  if (input.address) parts.push(`📍 ${escapeHtml(input.address)}`);
  if (input.comment) parts.push(`💬 ${escapeHtml(input.comment)}`);

  const bot = createBot();
  await bot.api.sendMessage(chatId, parts.join("\n"), { parse_mode: "HTML" });
}

