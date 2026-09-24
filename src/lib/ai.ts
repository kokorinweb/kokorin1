import Anthropic from "@anthropic-ai/sdk";
import { COMPANY, UNKNOWNS } from "./company";
import { CATEGORIES } from "./catalog";
import type { Brief } from "./brief";
import { briefIsReady } from "./brief";

export const AI_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type AssistantReply = {
  text: string;
  /** Бриф после хода: то, что было, плюс то, что модель записала. */
  brief: Brief;
  ready: boolean;
};

let client: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY не задан");
  client ??= new Anthropic({ apiKey });
  return client;
}

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function buildSystemPrompt(): string {
  const catalog = CATEGORIES.map(
    (category) => `- ${category.title}: ${category.blurb} Уточняем: ${category.asks.join(", ")}.`,
  ).join("\n");

  return `Ты — помощник на сайте компании «${COMPANY.name}», ${COMPANY.tagline.toLowerCase()}.

Твоя работа — не консультировать, а собрать заявку. Мебель делается по индивидуальным размерам, поэтому менеджеру нужны вводные, а не общий вопрос «сколько стоит кухня». Ты задаёшь вопросы, записываешь ответы инструментом update_brief и передаёшь готовый бриф менеджеру в WhatsApp.

НАПРАВЛЕНИЯ
${catalog}

ЧТО НУЖНО СОБРАТЬ
Направление, помещение, размеры (хотя бы примерные), пожелания по виду и материалам, срок, имя и телефон. Телефон и направление обязательны, остальное — насколько клиент готов рассказать.

ЧЕГО ТЫ НЕ ЗНАЕШЬ И НЕ ПРИДУМЫВАЕШЬ
${UNKNOWNS.map((item) => `- ${item}`).join("\n")}
Спросили про что-то из этого списка — честно отвечай, что это считает менеджер по конкретным размерам, и что он ответит в WhatsApp, как только увидит заявку. Не называй ни одной цифры, ни одного срока, ни одного бренда. Не обещай замер, выезд дизайнера и дизайн-проект: условий этих услуг у тебя нет.

КОНТАКТЫ
Адрес: ${COMPANY.address}. ${COMPANY.hours}. Телефон, WhatsApp и Viber — ${COMPANY.phone}.

КАК ВЕСТИ ДИАЛОГ
1. Один вопрос за сообщение. Два-три предложения, не больше. Живым языком, на «вы», без канцелярита.
2. После каждого содержательного ответа вызывай update_brief и записывай то, что услышал, своими словами и аккуратно: «прямая 3,2 м, потолок 2,7», а не «клиент сообщил размеры».
3. Не переспрашивай то, что уже записано в брифе.
4. Клиент не знает размеров — это нормально, так и запиши: «точных размеров нет». Не настаивай.
5. Клиент хочет сразу написать в WhatsApp или позвонить — не удерживай, дай номер ${COMPANY.phone}.
6. Когда есть направление и телефон, вызови update_brief в последний раз и скажи, что заявка собрана и её можно отправить кнопкой ниже — откроется WhatsApp с уже готовым текстом. Не пиши сам текст заявки в чат: его соберёт сайт.
7. Отвечай только про мебель и заказ. На постороннее коротко возвращай к теме.`;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "update_brief",
    description:
      "Записать то, что уже известно о заказе. Вызывай после каждого ответа клиента, который добавил новую информацию. Передавай только те поля, которые узнал или уточнил на этом ходу.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        category: {
          type: ["string", "null"],
          description: `Направление: ${CATEGORIES.map((c) => c.title).join(", ")}. Можно уточнением, например «кухня угловая».`,
        },
        room: {
          type: ["string", "null"],
          description: "Помещение: комната, площадь, новостройка или готовый ремонт.",
        },
        sizes: {
          type: ["string", "null"],
          description: "Размеры своими словами или «точных размеров нет».",
        },
        wishes: {
          type: ["string", "null"],
          description: "Цвет, стиль, материалы, что должно поместиться.",
        },
        deadline: { type: ["string", "null"], description: "Желаемый срок." },
        name: { type: ["string", "null"], description: "Как обращаться к клиенту." },
        phone: { type: ["string", "null"], description: "Телефон для связи, как его назвал клиент." },
      },
      required: ["category", "room", "sizes", "wishes", "deadline", "name", "phone"],
    },
  },
];

const MAX_TOOL_ROUNDS = 3;
const BRIEF_KEYS = ["category", "room", "sizes", "wishes", "deadline", "name", "phone"] as const;

/** Склеивает то, что модель записала, с уже собранным брифом. Пустое не затирает. */
function mergeBrief(current: Brief, patch: Record<string, unknown>): Brief {
  const merged: Brief = { ...current };
  for (const key of BRIEF_KEYS) {
    const value = patch[key];
    if (typeof value === "string" && value.trim()) merged[key] = value.trim();
  }
  return merged;
}

function textOf(blocks: Anthropic.ContentBlock[]): string {
  return blocks
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

/** Один ход помощника, включая цикл вызова инструментов. */
export async function askAssistant(
  history: ChatMessage[],
  startingBrief: Brief,
): Promise<AssistantReply> {
  const anthropic = getClient();
  let brief = startingBrief;

  const messages: Anthropic.MessageParam[] = history.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1000,
      // Сбор брифа — разговор простой, а ждать ответа в виджете никто не любит.
      output_config: { effort: "low" },
      system: buildSystemPrompt(),
      tools: TOOLS,
      messages,
    });

    if (response.stop_reason === "refusal") {
      return {
        text: `Давайте продолжим в WhatsApp — там ответят быстрее. Телефон ${COMPANY.phone}.`,
        brief,
        ready: briefIsReady(brief),
      };
    }

    const toolUses = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    if (toolUses.length === 0) {
      return { text: textOf(response.content), brief, ready: briefIsReady(brief) };
    }

    const results: Anthropic.ToolResultBlockParam[] = toolUses.map((toolUse) => {
      brief = mergeBrief(brief, (toolUse.input ?? {}) as Record<string, unknown>);
      return {
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: briefIsReady(brief)
          ? "Записано. Направления и телефона достаточно — заявку можно отправлять."
          : "Записано.",
      };
    });

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: results });

    // Модель могла написать текст вместе с вызовом инструмента: если раунды
    // кончились, отдаём то, что уже есть, вместо пустого пузыря.
    if (round === MAX_TOOL_ROUNDS - 1) {
      const partial = textOf(response.content);
      return {
        text: partial || "Записал. Что ещё расскажете о заказе?",
        brief,
        ready: briefIsReady(brief),
      };
    }
  }

  return { text: "Записал. Что ещё расскажете о заказе?", brief, ready: briefIsReady(brief) };
}
