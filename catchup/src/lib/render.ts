import type { GroupDigest, PersonalDigest } from "./digest";
import { plural } from "./tz";

/** Телеграм в parse_mode HTML ругается на сырые угловые скобки и амперсанд. */
export function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const KIND_LABEL: Record<string, string> = {
  mention: "упомянули",
  reply: "ответили",
  question: "ждут ответа",
  commitment: "на тебе",
};

export function renderGroup(digest: GroupDigest, span: string, messageCount: number): string {
  const head = `<b>Что было за ${esc(span)}</b>\n<i>${messageCount} ${plural(
    messageCount,
    "сообщение",
    "сообщения",
    "сообщений",
  )}</i>`;

  if (digest.topics.length === 0 && digest.decisions.length === 0) {
    return `${head}\n\nНичего важного. Болтовня.`;
  }

  const parts = [head];

  if (digest.topics.length > 0) {
    parts.push(
      digest.topics
        .map((topic) => {
          const people = topic.people.length > 0 ? ` <i>— ${esc(topic.people.join(", "))}</i>` : "";
          return `• <b>${esc(topic.title)}</b>${people}\n  ${esc(topic.summary)}`;
        })
        .join("\n\n"),
    );
  }

  if (digest.decisions.length > 0) {
    parts.push(`<b>Договорились</b>\n${digest.decisions.map((d) => `✓ ${esc(d)}`).join("\n")}`);
  }

  if (digest.open_questions.length > 0) {
    parts.push(`<b>Висит без ответа</b>\n${digest.open_questions.map((q) => `? ${esc(q)}`).join("\n")}`);
  }

  return parts.join("\n\n");
}

export function renderPersonal(
  digest: PersonalDigest,
  chatTitle: string,
  span: string,
  messageCount: number,
): string {
  const head = `<b>${esc(chatTitle)}</b>\n<i>за ${esc(span)}, ${messageCount} ${plural(
    messageCount,
    "сообщение",
    "сообщения",
    "сообщений",
  )}</i>`;

  const parts = [head];

  if (digest.for_you.length > 0) {
    parts.push(
      `<b>Тебя касается</b>\n${digest.for_you
        .map((item) => {
          const label = KIND_LABEL[item.kind] ?? item.kind;
          return `→ <b>${esc(item.who)}</b> <i>(${label})</i>: ${esc(item.what)}`;
        })
        .join("\n")}`,
    );
  } else {
    parts.push("<b>Тебя касается</b>\nНичего — тебя не дёргали.");
  }

  if (digest.topics.length > 0) {
    parts.push(
      `<b>Общее</b>\n${digest.topics
        .map((topic) => `• <b>${esc(topic.title)}</b> — ${esc(topic.summary)}`)
        .join("\n")}`,
    );
  }

  return parts.join("\n\n");
}
