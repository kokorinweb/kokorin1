import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import {
  ANTHROPIC_KEY,
  DAILY_TOKEN_CAP,
  MAX_TRANSCRIPT_CHARS,
  MAX_TRANSCRIPT_MESSAGES,
  MODEL,
} from "./env";
import type { Chat, StoredMessage } from "./repo";
import { inputTokensToday, recordUsage } from "./repo";
import { formatTime } from "./tz";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!ANTHROPIC_KEY) throw new DigestError("ANTHROPIC_API_KEY не задан");
  client ??= new Anthropic({ apiKey: ANTHROPIC_KEY });
  return client;
}

export class DigestError extends Error {}

/* ------------------------------- схемы ---------------------------------- */

const TopicSchema = z.object({
  title: z.string().describe("Заголовок темы, 2–5 слов, без точки в конце"),
  summary: z.string().describe("Суть обсуждения в 1–2 предложениях"),
  people: z.array(z.string()).describe("Имена участников этой темы, как они в транскрипте"),
});

const GroupDigestSchema = z.object({
  topics: z.array(TopicSchema).describe("От 1 до 7 тем, от важной к проходной"),
  decisions: z.array(z.string()).describe("Договорённости: что решили, кто делает. Пусто, если не решали"),
  open_questions: z.array(z.string()).describe("Вопросы, заданные и оставшиеся без ответа"),
});

const PersonalItemSchema = z.object({
  kind: z
    .enum(["mention", "reply", "question", "commitment"])
    .describe("mention — упомянули; reply — ответили на его сообщение; question — спросили и ждут ответа; commitment — на нём повисла договорённость"),
  who: z.string().describe("Кто это написал"),
  what: z.string().describe("Что именно, одним предложением"),
});

const PersonalDigestSchema = z.object({
  for_you: z
    .array(PersonalItemSchema)
    .describe("Только то, что адресовано лично этому участнику. Пусто, если ничего не было"),
  topics: z.array(TopicSchema).describe("До 5 тем, которые он пропустил"),
});

export type GroupDigest = z.infer<typeof GroupDigestSchema>;
export type PersonalDigest = z.infer<typeof PersonalDigestSchema>;

/* ----------------------------- транскрипт -------------------------------- */

export type Transcript = { text: string; used: number; truncated: boolean };

/**
 * Собирает транскрипт под жёсткие потолки. Потолок на символы — это прямой
 * потолок на счёт за токены, поэтому он существует до того, как что-то уедет в API.
 */
export function buildTranscript(messages: StoredMessage[], tzOffsetMin: number): Transcript {
  const capped = messages.slice(-MAX_TRANSCRIPT_MESSAGES);
  const lines: string[] = [];
  let chars = 0;
  let used = 0;

  // Идём с конца: если резать, то раннее, а не свежее.
  for (let i = capped.length - 1; i >= 0; i -= 1) {
    const message = capped[i]!;
    const reply = message.reply_to ? ` (→ ${message.reply_to})` : "";
    const line = `[${formatTime(message.at, tzOffsetMin)}] ${message.author}${reply}: ${message.body}`;
    if (chars + line.length > MAX_TRANSCRIPT_CHARS) break;
    lines.push(line);
    chars += line.length + 1;
    used += 1;
  }

  lines.reverse();
  return { text: lines.join("\n"), used, truncated: used < messages.length };
}

/* ------------------------------- промпт ---------------------------------- */

const SYSTEM = `Ты делаешь сводки групповых чатов. Тебе дают транскрипт, ты возвращаешь структурированный пересказ.

ПРАВИЛА
1. Опирайся только на транскрипт. Ничего не додумывай: не было сказано — не пиши.
2. Имена бери ровно те, что в транскрипте.
3. Пиши по-русски, коротко и по-человечески. Никакого канцелярита и вводных оборотов.
4. Болтовню, приветствия, стикеры и «ахаха» не пересказывай — они не темы.
5. Договорённость — это когда есть действие и тот, кто его делает. Обсуждение без итога договорённостью не считается.
6. Открытый вопрос — это вопрос, на который в транскрипте нет ответа. Вопрос с ответом сюда не идёт.
7. Если в чате не происходило ничего осмысленного, верни пустые списки. Пустая сводка честнее выдуманной.`;

function taskForGroup(span: string): string {
  return `Выше — транскрипт группового чата за ${span}. Сделай общую сводку для всех участников.`;
}

function taskForPerson(name: string, span: string): string {
  return `Выше — транскрипт группового чата за ${span}. Участник по имени «${name}» отсутствовал и хочет узнать, что он пропустил.

В for_you положи только то, что касается лично «${name}»: где его упоминали, что ему отвечали, какие вопросы ему задали и остались без ответа, какие договорённости повисли на нём. Если ничего личного не было — верни пустой список, не подтягивай туда общие темы.

В topics положи то, что ему стоит знать из общего обсуждения.`;
}

/* ------------------------------- вызовы ---------------------------------- */

type Usage = { input: number; output: number; cacheRead: number };

function readUsage(usage: Anthropic.Usage): Usage {
  return {
    input: usage.input_tokens + (usage.cache_creation_input_tokens ?? 0),
    output: usage.output_tokens,
    cacheRead: usage.cache_read_input_tokens ?? 0,
  };
}

function assertBudget(chat: Chat): void {
  if (inputTokensToday(chat.id, chat.tz_offset_min) >= DAILY_TOKEN_CAP) {
    throw new DigestError(
      "Чат исчерпал суточный лимит на сводки. Лимит обнулится завтра — так бот не разоряет владельца.",
    );
  }
}

async function call<T>(
  chat: Chat,
  transcript: string,
  task: string,
  schema: z.ZodType<T>,
  cacheTranscript: boolean,
): Promise<T> {
  assertBudget(chat);

  const transcriptBlock: Anthropic.TextBlockParam = {
    type: "text",
    text: transcript,
    // Кэш окупается, только когда тот же транскрипт уходит повторно — это случай
    // персональных сводок: несколько человек одного чата догоняют одно и то же окно.
    // Для единственной дневной сводки запись в кэш была бы чистой переплатой.
    ...(cacheTranscript ? { cache_control: { type: "ephemeral" as const } } : {}),
  };

  let response;
  try {
    response = await getClient().messages.parse({
      model: MODEL,
      max_tokens: 16_000,
      system: SYSTEM,
      output_config: { format: zodOutputFormat(schema), effort: "low" },
      messages: [{ role: "user", content: [transcriptBlock, { type: "text", text: task }] }],
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      throw new DigestError("Сейчас слишком много запросов. Попробуй через минуту.");
    }
    if (error instanceof Anthropic.AuthenticationError) {
      throw new DigestError("Ключ Anthropic не принят. Это поломка на нашей стороне.");
    }
    if (error instanceof Anthropic.APIError) {
      throw new DigestError(`Модель не ответила (${error.status}). Попробуй ещё раз.`);
    }
    throw error;
  }

  const usage = readUsage(response.usage);
  recordUsage(chat.id, chat.tz_offset_min, usage.input, usage.output, usage.cacheRead);

  if (response.stop_reason === "refusal") {
    throw new DigestError("Модель отказалась пересказывать этот фрагмент.");
  }
  if (!response.parsed_output) {
    throw new DigestError("Не удалось разобрать ответ модели. Попробуй ещё раз.");
  }
  return response.parsed_output;
}

export function groupDigest(chat: Chat, transcript: string, span: string): Promise<GroupDigest> {
  return call(chat, transcript, taskForGroup(span), GroupDigestSchema, false);
}

export function personalDigest(
  chat: Chat,
  transcript: string,
  name: string,
  span: string,
): Promise<PersonalDigest> {
  return call(chat, transcript, taskForPerson(name, span), PersonalDigestSchema, true);
}
