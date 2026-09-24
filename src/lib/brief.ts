/**
 * Бриф — единственный формат заявки на сайте.
 *
 * К нему сходятся все три пути: ИИ-помощник, тот же помощник без ключа
 * (скриптовый сценарий) и обычная форма. Дальше бриф превращается в одно
 * сообщение в WhatsApp — туда, где в компании реально отвечают. Никакого
 * бэкенда для заявок нет специально: некуда класть лид, который никто не
 * прочитает.
 */

import { whatsappUrl } from "./company";

export type Brief = {
  /** Направление: кухня, шкаф-купе и т.д. Свободный текст — человек пишет как хочет. */
  category?: string;
  /** Помещение: комната, площадь, состояние ремонта. */
  room?: string;
  /** Размеры или честное «точных нет». */
  sizes?: string;
  /** Цвет, стиль, материалы, что должно поместиться. */
  wishes?: string;
  /** Желаемый срок. */
  deadline?: string;
  name?: string;
  phone?: string;
};

export const BRIEF_FIELDS = [
  "category",
  "room",
  "sizes",
  "wishes",
  "deadline",
  "name",
  "phone",
] as const satisfies readonly (keyof Brief)[];

const LABELS: Record<keyof Brief, string> = {
  category: "Нужна",
  room: "Помещение",
  sizes: "Размеры",
  wishes: "Пожелания",
  deadline: "Сроки",
  name: "Имя",
  phone: "Телефон",
};

/** Шаги для режима без ИИ: те же поля, только вопросы заданы заранее. */
export const SCRIPT_STEPS: { field: keyof Brief; question: string }[] = [
  {
    field: "category",
    question:
      "Давайте соберём заявку по шагам. Что нужно: кухня, шкаф-купе, корпусная мебель, мебель из стекла или стеновые панели?",
    },
  {
    field: "room",
    question:
      "Куда это встаёт? Опишите помещение: какая комната, примерная площадь, новостройка или уже с ремонтом.",
  },
  {
    field: "sizes",
    question:
      "Какие размеры? Достаточно примерных: длина по стенам, высота потолка, ширина проёма. Если точных нет — так и напишите.",
  },
  {
    field: "wishes",
    question:
      "Что по пожеланиям: цвет, стиль, материалы фасадов, что обязательно должно поместиться?",
  },
  {
    field: "deadline",
    question: "К какому сроку хотелось бы? Хотя бы примерно — месяц или «не горит».",
  },
  { field: "name", question: "Как к вам обращаться?" },
  {
    field: "phone",
    question: "И номер телефона — на него же ответят в WhatsApp.",
  },
];

/** Заполненные поля брифа в порядке BRIEF_FIELDS. */
export function briefEntries(brief: Brief): { label: string; value: string }[] {
  return BRIEF_FIELDS.flatMap((field) => {
    const value = brief[field]?.trim();
    return value ? [{ label: LABELS[field], value }] : [];
  });
}

/**
 * Минимум, при котором заявку уже есть смысл отправлять: что нужно + как
 * перезвонить. Остальное менеджер уточнит в переписке.
 */
export function briefIsReady(brief: Brief): boolean {
  return Boolean(brief.category?.trim() && brief.phone?.trim());
}

/** Бриф одним сообщением — так он приходит в WhatsApp. */
export function briefToMessage(brief: Brief): string {
  const lines = briefEntries(brief).map(({ label, value }) => `${label}: ${value}`);
  return ["Здравствуйте! Заявка с сайта.", "", ...lines].join("\n");
}

export function briefToWhatsappUrl(brief: Brief): string {
  return whatsappUrl(briefToMessage(brief));
}
