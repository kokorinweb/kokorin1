/** Реквизиты и правила заведения. Используются сайтом, ботом и ИИ-помощником. */

export const RESTAURANT = {
  name: "Osteria Bellini",
  tagline: "Настоящая итальянская кухня на дровах",
  address: "Москва, Большая Никитская, 24",
  metro: "м. Арбатская, 7 минут пешком",
  phone: "+7 (495) 123-45-67",
  phoneHref: "+74951234567",
  email: "ciao@osteria-bellini.ru",
  telegram: "https://t.me/osteria_bellini_bot",
  hours: [
    { days: "Пн — Чт", time: "12:00 — 23:00" },
    { days: "Пт — Сб", time: "12:00 — 01:00" },
    { days: "Вс", time: "12:00 — 23:00" },
  ],
  /** Правила доставки — единственное место, где они заданы. */
  delivery: {
    /** Минимальная сумма заказа на доставку, ₽. */
    minOrder: 1500,
    /** Стоимость доставки, ₽. */
    fee: 300,
    /** От какой суммы доставка бесплатна, ₽. */
    freeFrom: 4000,
    /** Ориентировочное время, минут. */
    etaMinutes: 60,
    zone: "в пределах Садового кольца",
  },
  pickup: {
    etaMinutes: 25,
    discountPercent: 10,
  },
} as const;

/** Публичный адрес сайта. На него ведут кнопки бота и ссылки в ответах ИИ. */
export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://osteria-bellini.ru";
}
