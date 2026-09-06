import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIES, MENU, formatPrice, getMenuItem } from "./menu";
import { RESTAURANT, siteUrl } from "./restaurant";

export const AI_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

export type Channel = "web" | "telegram";

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Действие, которое фронт должен выполнить после ответа ассистента. */
export type AssistantAction =
  | { type: "add_to_cart"; itemId: string; quantity: number }
  | { type: "show_category"; category: string };

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
 * Отдаём весь список целиком: он маленький (~25 позиций), а RAG на таком объёме —
 * лишняя сложность и лишний источник ошибок.
 */
function menuForPrompt(): string {
  return CATEGORIES.map((category) => {
    const lines = MENU.filter((item) => item.category === category.id).map((item) => {
      const flags = [
        item.vegetarian ? "вегетарианское" : null,
        item.spicy ? "острое" : null,
        item.allergens.length ? `аллергены: ${item.allergens.join(", ")}` : "без заявленных аллергенов",
      ]
        .filter(Boolean)
        .join("; ");
      return `- [${item.id}] ${item.name} (${item.nameIt}), ${formatPrice(item.price)}, ${item.portion}. ${item.description} ${flags}.`;
    });
    return `## ${category.title} — ${category.subtitle}\n${lines.join("\n")}`;
  }).join("\n\n");
}

function buildSystemPrompt(channel: Channel): string {
  const hours = RESTAURANT.hours.map((h) => `${h.days}: ${h.time}`).join("; ");
  const d = RESTAURANT.delivery;

  const channelRules =
    channel === "web"
      ? `Ты работаешь в виджете чата на сайте. У тебя есть инструменты add_to_cart и show_category — пользуйся ими, когда гость просит что-то добавить или показать раздел меню. После вызова add_to_cart коротко подтверди словами, что добавил.`
      : `Ты работаешь в Telegram-боте. Инструментов у тебя нет: собрать корзину и оформить заказ гость может на сайте ${siteUrl()} или по телефону ${RESTAURANT.phone}. Пиши обычным текстом, компактно, без Markdown и таблиц.`;

  return `Ты — Лука, ИИ-консультант ресторана «${RESTAURANT.name}». ${RESTAURANT.tagline}.

СВЕДЕНИЯ О ЗАВЕДЕНИИ
Адрес: ${RESTAURANT.address} (${RESTAURANT.metro}).
Телефон: ${RESTAURANT.phone}. Почта: ${RESTAURANT.email}.
Часы работы: ${hours}.
Доставка: ${d.zone}, минимальный заказ ${d.minOrder} ₽, стоимость ${d.fee} ₽, бесплатно от ${d.freeFrom} ₽, примерно ${d.etaMinutes} минут.
Самовывоз: готовность примерно ${RESTAURANT.pickup.etaMinutes} минут, скидка ${RESTAURANT.pickup.discountPercent}%.

МЕНЮ (полное, других блюд не существует)
${menuForPrompt()}

ПРАВИЛА
1. Отвечай только на основании сведений выше. Если чего-то нет в меню — прямо скажи, что такого блюда нет, и предложи ближайшую альтернативу из меню.
2. Никогда не выдумывай блюда, цены, состав, акции, наличие столиков и сроки. Цены называй ровно те, что указаны.
3. Про аллергены отвечай только по полю «аллергены». Обязательно добавляй, что производство общее и следы других аллергенов возможны, а при серьёзной аллергии нужно предупредить менеджера по телефону ${RESTAURANT.phone}.
4. Бронь столика, изменение или отмена заказа, жалобы, вопросы о вакансиях и всё, чего нет в твоих данных, — переводи на телефон ${RESTAURANT.phone}. Не обещай ничего от имени ресторана.
5. Отвечай по-русски (или на языке гостя), тепло и по делу: 2–4 предложения, без канцелярита и без списка на пол-экрана, если гость сам не попросил подробностей.
6. Ты не обрабатываешь оплату и не видишь статус существующих заказов.

${channelRules}`;
}

const WEB_TOOLS: Anthropic.Tool[] = [
  {
    name: "add_to_cart",
    description:
      "Добавить блюдо в корзину гостя на сайте. Вызывай только когда гость явно согласился заказать конкретную позицию.",
    input_schema: {
      type: "object",
      properties: {
        itemId: {
          type: "string",
          description: "Идентификатор блюда из меню, например carbonara",
        },
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
          enum: CATEGORIES.map((c) => c.id),
          description: "Идентификатор раздела меню",
        },
      },
      required: ["category"],
    },
  },
];

const MAX_TOOL_ROUNDS = 3;

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
    if (!CATEGORIES.some((c) => c.id === category)) {
      return { result: `Ошибка: раздела «${category}» не существует.`, isError: true };
    }
    return { result: "Раздел открыт.", action: { type: "show_category", category } };
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
  const tools = channel === "web" ? WEB_TOOLS : [];
  const actions: AssistantAction[] = [];

  const messages: Anthropic.MessageParam[] = history.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 700,
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
      const partial = textOf(response.content);
      return {
        text: partial || "Готово! Что-нибудь ещё?",
        actions,
      };
    }
  }

  return { text: "Готово! Что-нибудь ещё?", actions };
}
