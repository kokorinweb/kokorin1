import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIES, MENU, formatPrice, getMenuItem, portionLabel } from "./menu";
import { RESTAURANT, siteUrl } from "./restaurant";
import {
  ZONES,
  formatDateKey,
  moscowNow,
  slotStates,
  tableAvailability,
  toDateKey,
} from "./booking";

export const AI_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

export type Channel = "web" | "telegram";

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Действие, которое фронт должен выполнить после ответа ассистента. */
export type AssistantAction =
  | { type: "add_to_cart"; itemId: string; quantity: number }
  | { type: "show_category"; category: string }
  | { type: "open_booking" };

export type AssistantReply = {
  text: string;
  actions: AssistantAction[];
};

let client: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY не задан");
  }
  client ??= new Anthropic({ apiKey });
  return client;
}

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Меню в компактном виде для контекста модели.
 * Отдаём весь список целиком: он маленький (~47 позиций), а RAG на таком объёме —
 * лишняя сложность и лишний источник ошибок.
 */
function menuForPrompt(): string {
  return CATEGORIES.map((category) => {
    const lines = MENU.filter((item) => item.category === category.id).map((item) => {
      const flags = [
        item.tags.length ? `признаки: ${item.tags.join(", ")}` : null,
        item.allergens.length
          ? `аллергены: ${item.allergens.join(", ")}`
          : "без заявленных аллергенов",
        item.chef ? "блюдо шефа" : null,
      ]
        .filter(Boolean)
        .join("; ");
      return `- [${item.id}] ${item.name} (${item.nameJp}), ${formatPrice(item.price)}, ${portionLabel(item)}. Состав: ${item.composition.join(", ")}. ${flags}.`;
    });
    return `## ${category.title} — ${category.subtitle}\n${lines.join("\n")}`;
  }).join("\n\n");
}

function buildSystemPrompt(channel: Channel): string {
  const hours = RESTAURANT.hours.map((row) => `${row.days}: ${row.time}`).join("; ");
  const today = moscowNow();
  const zones = ZONES.map(
    (zone) => `${zone.title}${zone.surcharge ? ` (депозит ${zone.surcharge} ₽)` : ""}`,
  ).join(", ");

  const channelRules =
    channel === "web"
      ? `Ты работаешь в виджете чата на сайте. Инструменты: add_to_cart (положить блюдо в корзину), show_category (открыть раздел меню), check_tables (посмотреть свободные столики), open_booking (открыть форму брони). После add_to_cart коротко подтверди словами, что добавил.`
      : `Ты работаешь в Telegram-боте. Корзина и бронь — на сайте ${siteUrl()}. Инструмент check_tables у тебя есть: им можно честно посмотреть свободное время. Пиши обычным текстом, компактно, без Markdown и таблиц.`;

  return `Ты — Кай, ИИ-консультант японского ресторана «${RESTAURANT.name}». ${RESTAURANT.tagline}.

СВЕДЕНИЯ О ЗАВЕДЕНИИ
Адрес: ${RESTAURANT.address} (${RESTAURANT.metro}).
Телефон: ${RESTAURANT.phone}. Почта: ${RESTAURANT.email}.
Часы работы: ${hours}.
Сегодня: ${formatDateKey(toDateKey(today))}, время ${today.getHours()}:${`${today.getMinutes()}`.padStart(2, "0")} по Москве.
Залы для брони: ${zones}.
Бронь бесплатная, без предоплаты, стол держим 20 минут. Забронировать можно на сайте ${siteUrl()}/booking.
После брони гость может заказать блюда заранее — их подадут через ${RESTAURANT.preorder.leadMinutes} минут после его прихода.
Самовывоз: готовность ${RESTAURANT.pickup.etaMinutes} минут, скидка ${RESTAURANT.pickup.discountPercent}%.
Доставки у нас нет — про доставку отвечай честно, что не возим, и предлагай самовывоз или столик.

МЕНЮ (полное, других блюд не существует)
${menuForPrompt()}

ПРАВИЛА
1. Отвечай только на основании сведений выше и результатов инструментов. Нет блюда в меню — так и скажи и предложи ближайшую замену.
2. Никогда не выдумывай блюда, цены, состав, акции и свободные столики. Свободное время узнавай только через check_tables, на память не отвечай.
3. Про аллергены отвечай строго по полю «аллергены». Всегда добавляй, что производство общее и следы других аллергенов возможны, а при серьёзной аллергии нужно предупредить менеджера: ${RESTAURANT.phone}.
4. Сам ты бронь не оформляешь и заказ не подтверждаешь: бронь гость завершает на сайте (можно вызвать open_booking), заказ — в корзине. Отмену и изменение брони переводи на телефон ${RESTAURANT.phone}.
5. Отвечай по-русски (или на языке гостя), тепло и по делу: 2–4 предложения, без канцелярита.
6. Оплату ты не обрабатываешь и статус существующих заказов не видишь.

${channelRules}`;
}

const CHECK_TABLES_TOOL: Anthropic.Tool = {
  name: "check_tables",
  description:
    "Проверить свободное время и столики на дату. Возвращает список доступных слотов, а если передать time — ещё и свободные столы по залам.",
  input_schema: {
    type: "object",
    properties: {
      date: { type: "string", description: "Дата в формате ГГГГ-ММ-ДД" },
      guests: { type: "integer", minimum: 1, maximum: 12, description: "Количество гостей" },
      time: { type: "string", description: "Время в формате ЧЧ:ММ, необязательно" },
    },
    required: ["date", "guests"],
  },
};

const WEB_TOOLS: Anthropic.Tool[] = [
  {
    name: "add_to_cart",
    description:
      "Добавить блюдо в корзину гостя на сайте. Вызывай только когда гость явно согласился заказать конкретную позицию.",
    input_schema: {
      type: "object",
      properties: {
        itemId: { type: "string", description: "Идентификатор блюда из меню, например philadelphia" },
        quantity: { type: "integer", minimum: 1, maximum: 10, description: "Количество порций" },
      },
      required: ["itemId", "quantity"],
    },
  },
  {
    name: "show_category",
    description: "Открыть гостю раздел меню на сайте.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: CATEGORIES.map((category) => category.id),
          description: "Идентификатор раздела меню",
        },
      },
      required: ["category"],
    },
  },
  {
    name: "open_booking",
    description: "Открыть гостю форму бронирования столика.",
    input_schema: { type: "object", properties: {} },
  },
  CHECK_TABLES_TOOL,
];

const TELEGRAM_TOOLS: Anthropic.Tool[] = [CHECK_TABLES_TOOL];

const MAX_TOOL_ROUNDS = 4;

/** Выполняет инструмент и возвращает результат для модели + действие для клиента. */
function runTool(
  name: string,
  input: Record<string, unknown>,
): { result: string; action?: AssistantAction; isError?: boolean } {
  if (name === "add_to_cart") {
    const itemId = String(input.itemId ?? "");
    const quantity = Math.max(1, Math.min(10, Number(input.quantity ?? 1) || 1));
    const item = getMenuItem(itemId);
    if (!item) {
      return { result: `Ошибка: блюда с id «${itemId}» нет в меню.`, isError: true };
    }
    return {
      result: `Добавлено в корзину: ${item.name} x${quantity}, ${formatPrice(item.price * quantity)}.`,
      action: { type: "add_to_cart", itemId, quantity },
    };
  }

  if (name === "show_category") {
    const category = String(input.category ?? "");
    if (!CATEGORIES.some((row) => row.id === category)) {
      return { result: `Ошибка: раздела «${category}» не существует.`, isError: true };
    }
    return { result: "Раздел открыт.", action: { type: "show_category", category } };
  }

  if (name === "open_booking") {
    return { result: "Форма бронирования открыта.", action: { type: "open_booking" } };
  }

  if (name === "check_tables") {
    const date = String(input.date ?? "");
    const guests = Math.max(1, Math.min(12, Number(input.guests ?? 2) || 2));
    const time = input.time ? String(input.time) : null;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { result: "Ошибка: дата должна быть в формате ГГГГ-ММ-ДД.", isError: true };
    }

    const free = slotStates(date, guests).filter((state) => state.available);
    if (free.length === 0) {
      return {
        result: `На ${formatDateKey(date)} свободного времени на ${guests} гостей нет.`,
      };
    }

    if (!time) {
      return {
        result: `Свободное время на ${formatDateKey(date)} для ${guests} гостей: ${free.map((state) => state.slot).join(", ")}.`,
      };
    }

    const tables = tableAvailability(date, time, guests).filter(
      (table) => table.free && !table.tooSmall,
    );
    if (tables.length === 0) {
      return {
        result: `На ${time} свободных столов на ${guests} гостей нет. Свободно другое время: ${free.map((state) => state.slot).join(", ")}.`,
      };
    }

    const byZone = ZONES.map((zone) => {
      const ids = tables.filter((table) => table.zone === zone.id).map((table) => table.tableId);
      return ids.length ? `${zone.title}: столы ${ids.join(", ")}` : null;
    })
      .filter(Boolean)
      .join("; ");

    return { result: `На ${formatDateKey(date)} в ${time} свободно. ${byZone}.` };
  }

  return { result: `Ошибка: неизвестный инструмент «${name}».`, isError: true };
}

function textOf(blocks: Anthropic.ContentBlock[]): string {
  return blocks
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

/** Один ход диалога с ассистентом, включая цикл вызова инструментов. */
export async function askAssistant(
  history: ChatMessage[],
  channel: Channel,
): Promise<AssistantReply> {
  const anthropic = getClient();
  const tools = channel === "web" ? WEB_TOOLS : TELEGRAM_TOOLS;
  const actions: AssistantAction[] = [];

  const messages: Anthropic.MessageParam[] = history.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 800,
      system: buildSystemPrompt(channel),
      tools,
      messages,
    });

    const toolUses = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    if (toolUses.length === 0) {
      return { text: textOf(response.content), actions };
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUses) {
      const outcome = runTool(toolUse.name, (toolUse.input ?? {}) as Record<string, unknown>);
      if (outcome.action) actions.push(outcome.action);
      results.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: outcome.result,
        is_error: outcome.isError,
      });
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: results });

    // Модель могла написать текст вместе с вызовом инструмента — если это был
    // последний разрешённый раунд, отдаём то, что уже есть.
    if (round === MAX_TOOL_ROUNDS - 1) {
      return { text: textOf(response.content) || "Готово! Что-нибудь ещё?", actions };
    }
  }

  return { text: "Готово! Что-нибудь ещё?", actions };
}
