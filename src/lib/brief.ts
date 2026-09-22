import { z } from "zod";

/**
 * Схема заявки. Одна и та же форма проверяется на клиенте и на сервере,
 * поэтому схема живёт отдельно от роута и от компонента.
 */
export const briefSchema = z.object({
  role: z.string().max(80).optional().default(""),
  goal: z.string().max(80).optional().default(""),
  task: z.string().trim().min(10, "Опишите задачу хотя бы одним предложением").max(4000),
  contact: z.string().trim().min(2, "Укажите Telegram для ответа").max(120),
  consent: z.literal(true, { message: "Нужно согласие на обработку данных" }),
});

export type BriefInput = z.input<typeof briefSchema>;
export type Brief = z.output<typeof briefSchema>;

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function formatBrief(brief: Brief) {
  const lines = [
    "<b>Новая заявка с сайта</b>",
    "",
    brief.role ? `<b>Кто:</b> ${escapeHtml(brief.role)}` : null,
    brief.goal ? `<b>Задача:</b> ${escapeHtml(brief.goal)}` : null,
    "",
    escapeHtml(brief.task),
    "",
    `<b>Связь:</b> ${escapeHtml(brief.contact)}`,
  ];
  return lines.filter((line) => line !== null).join("\n");
}
