/** Реквизиты и правила заведения. Единственный источник — используется сайтом, ботом и ИИ. */

export const RESTAURANT = {
  name: "НОРИ",
  nameLatin: "NORI",
  /** Пишется на печати-ханко в шапке и в декоративных блоках. */
  kanji: "海苔",
  tagline: "японская кухня в центре города",
  address: "Москва, Малая Бронная, 18",
  metro: "м. Патриаршие, 5 минут пешком",
  phone: "+7 (495) 771-06-06",
  phoneHref: "+74957710606",
  email: "hello@nori.rest",
  telegram: "https://t.me/nori_rest_bot",
  vk: "https://vk.com/nori_rest",
  instagram: "https://instagram.com/nori.rest",
  mapRoute: "https://yandex.ru/maps/?rtext=~55.763100,37.592800&rtt=auto",
  coords: { lat: 55.7631, lon: 37.5928 },
  rating: { score: 4.9, count: 1284, sources: ["Яндекс Карты", "2ГИС"] },
  since: 2016,

  /** Часы работы по дням недели. day: 0 = воскресенье, как в Date.getDay(). */
  hours: [
    { days: "Пн — Чт", time: "11:00 — 23:00", dayIndexes: [1, 2, 3, 4], open: "11:00", close: "23:00" },
    { days: "Пт — Сб", time: "11:00 — 01:00", dayIndexes: [5, 6], open: "11:00", close: "01:00" },
    { days: "Вс", time: "11:00 — 23:00", dayIndexes: [0], open: "11:00", close: "23:00" },
  ],

  /** Самовывоз: единственный способ забрать заказ без брони столика. */
  pickup: {
    etaMinutes: 30,
    discountPercent: 10,
  },

  /** Насколько заранее кухня успевает приготовить предзаказ к подаче за столик. */
  preorder: {
    /** Блюда будут готовы через столько минут после времени брони. */
    leadMinutes: 5,
    /** Минимальный отступ подачи от времени брони, минут. */
    minOffsetMinutes: 0,
    maxOffsetMinutes: 120,
  },
} as const;

export type WorkingHours = (typeof RESTAURANT.hours)[number];

/** Часы работы для конкретного дня недели (0 = вс). */
export function hoursForDay(day: number): WorkingHours {
  return (
    RESTAURANT.hours.find((row) => (row.dayIndexes as readonly number[]).includes(day)) ??
    RESTAURANT.hours[0]
  );
}

/** Публичный адрес сайта. На него ведут кнопки бота и ссылки в ответах ИИ. */
export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://nori.rest";
}

export const SOCIALS = [
  { label: "Telegram", href: RESTAURANT.telegram },
  { label: "VK", href: RESTAURANT.vk },
  { label: "Instagram*", href: RESTAURANT.instagram },
] as const;

/** Сноска к Instagram: требование российского законодательства, а не наша прихоть. */
export const INSTAGRAM_NOTE =
  "* Instagram принадлежит Meta, признанной экстремистской организацией и запрещённой в РФ.";
