/**
 * Единственный источник правды по меню.
 * Его читают: витрина сайта, валидация заказа, ИИ-помощник и Telegram-бот.
 * Меняешь цену здесь — она меняется везде. Больше нигде цены не дублируются.
 */

export type CategoryId =
  | "antipasti"
  | "primi"
  | "pizza"
  | "secondi"
  | "dolci"
  | "bevande";

export type Allergen =
  | "глютен"
  | "молоко"
  | "яйцо"
  | "орехи"
  | "рыба"
  | "морепродукты"
  | "сельдерей";

export type MenuItem = {
  id: string;
  name: string;
  nameIt: string;
  category: CategoryId;
  /** Цена в рублях, целое число. Никаких дробей — избавляемся от ошибок округления. */
  price: number;
  /** Вес/объём порции, для вывода в карточке. */
  portion: string;
  description: string;
  allergens: Allergen[];
  vegetarian: boolean;
  spicy: boolean;
  /** Показывать на главной в блоке «Рекомендуем». */
  featured?: boolean;
};

export const CATEGORIES: { id: CategoryId; title: string; subtitle: string }[] = [
  { id: "antipasti", title: "Antipasti", subtitle: "Закуски" },
  { id: "primi", title: "Primi piatti", subtitle: "Паста и ризотто" },
  { id: "pizza", title: "Pizza", subtitle: "Неаполитанская, на дровах" },
  { id: "secondi", title: "Secondi", subtitle: "Основные блюда" },
  { id: "dolci", title: "Dolci", subtitle: "Десерты" },
  { id: "bevande", title: "Bevande", subtitle: "Напитки" },
];

export const MENU: MenuItem[] = [
  // --- Antipasti ---
  {
    id: "brusch-pomodoro",
    name: "Брускетта с томатами",
    nameIt: "Bruschetta al pomodoro",
    category: "antipasti",
    price: 490,
    portion: "180 г",
    description:
      "Хрустящая чиабатта на гриле, черри конфи, базилик, чеснок и оливковое масло Extra Virgin.",
    allergens: ["глютен"],
    vegetarian: true,
    spicy: false,
    featured: true,
  },
  {
    id: "burrata-parma",
    name: "Буррата с пармской ветчиной",
    nameIt: "Burrata con prosciutto di Parma",
    category: "antipasti",
    price: 1290,
    portion: "260 г",
    description:
      "Буррата из Апулии, пармская ветчина 18 месяцев, руккола, вяленые томаты, соус песто.",
    allergens: ["молоко", "орехи"],
    vegetarian: false,
    spicy: false,
    featured: true,
  },
  {
    id: "vitello-tonnato",
    name: "Вителло тоннато",
    nameIt: "Vitello tonnato",
    category: "antipasti",
    price: 990,
    portion: "200 г",
    description: "Телятина медленного томления под соусом из тунца, каперсы, лимон.",
    allergens: ["рыба", "яйцо"],
    vegetarian: false,
    spicy: false,
  },
  {
    id: "caprese",
    name: "Капрезе",
    nameIt: "Insalata caprese",
    category: "antipasti",
    price: 790,
    portion: "240 г",
    description: "Моцарелла ди буфала, бычье сердце, базилик, крем из бальзамика.",
    allergens: ["молоко"],
    vegetarian: true,
    spicy: false,
  },

  // --- Primi ---
  {
    id: "carbonara",
    name: "Карбонара",
    nameIt: "Spaghetti alla carbonara",
    category: "primi",
    price: 890,
    portion: "320 г",
    description:
      "Спагетти, гуанчиале, яичный желток, пекорино романо, чёрный перец. Без сливок — как в Риме.",
    allergens: ["глютен", "яйцо", "молоко"],
    vegetarian: false,
    spicy: false,
    featured: true,
  },
  {
    id: "cacio-e-pepe",
    name: "Качо э пепе",
    nameIt: "Cacio e pepe",
    category: "primi",
    price: 790,
    portion: "300 г",
    description: "Тонарелли, пекорино романо и чёрный перец. Три ингредиента и ничего лишнего.",
    allergens: ["глютен", "молоко"],
    vegetarian: true,
    spicy: false,
  },
  {
    id: "ragu-bolognese",
    name: "Тальятелле болоньезе",
    nameIt: "Tagliatelle al ragù",
    category: "primi",
    price: 940,
    portion: "340 г",
    description: "Домашние тальятелле, рагу из говядины и свинины, томившееся 6 часов, пармезан.",
    allergens: ["глютен", "яйцо", "молоко", "сельдерей"],
    vegetarian: false,
    spicy: false,
  },
  {
    id: "risotto-funghi",
    name: "Ризотто с белыми грибами",
    nameIt: "Risotto ai porcini",
    category: "primi",
    price: 1090,
    portion: "300 г",
    description: "Карнароли, белые грибы, пармезан 24 месяца, трюфельное масло.",
    allergens: ["молоко", "сельдерей"],
    vegetarian: true,
    spicy: false,
  },
  {
    id: "vongole",
    name: "Спагетти вонголе",
    nameIt: "Spaghetti alle vongole",
    category: "primi",
    price: 1390,
    portion: "330 г",
    description: "Спагетти, моллюски вонголе, белое вино, чеснок, петрушка, чили.",
    allergens: ["глютен", "морепродукты"],
    vegetarian: false,
    spicy: true,
  },

  // --- Pizza ---
  {
    id: "margherita",
    name: "Маргарита",
    nameIt: "Pizza Margherita",
    category: "pizza",
    price: 690,
    portion: "30 см",
    description: "Томаты Сан-Марцано, моцарелла фиор ди латте, базилик, оливковое масло.",
    allergens: ["глютен", "молоко"],
    vegetarian: true,
    spicy: false,
    featured: true,
  },
  {
    id: "diavola",
    name: "Дьявола",
    nameIt: "Pizza Diavola",
    category: "pizza",
    price: 890,
    portion: "30 см",
    description: "Острая салями «Вентричина», моцарелла, халапеньо, томатный соус.",
    allergens: ["глютен", "молоко"],
    vegetarian: false,
    spicy: true,
  },
  {
    id: "quattro-formaggi",
    name: "Четыре сыра",
    nameIt: "Pizza Quattro formaggi",
    category: "pizza",
    price: 950,
    portion: "30 см",
    description: "Моцарелла, горгонзола, таледжо, пармезан, мёд из акации.",
    allergens: ["глютен", "молоко"],
    vegetarian: true,
    spicy: false,
  },
  {
    id: "prosciutto-funghi",
    name: "Прошутто э фунги",
    nameIt: "Pizza Prosciutto e funghi",
    category: "pizza",
    price: 890,
    portion: "30 см",
    description: "Варёная ветчина, шампиньоны, моцарелла, томатный соус, орегано.",
    allergens: ["глютен", "молоко"],
    vegetarian: false,
    spicy: false,
  },

  // --- Secondi ---
  {
    id: "ossobuco",
    name: "Оссобуко по-милански",
    nameIt: "Ossobuco alla milanese",
    category: "secondi",
    price: 1890,
    portion: "380 г",
    description: "Телячья голяшка, томлённая в белом вине, с шафрановым ризотто и гремолатой.",
    allergens: ["молоко", "сельдерей"],
    vegetarian: false,
    spicy: false,
    featured: true,
  },
  {
    id: "branzino",
    name: "Сибас в соляной корке",
    nameIt: "Branzino al sale",
    category: "secondi",
    price: 2190,
    portion: "450 г",
    description: "Целый сибас, запечённый в морской соли, лимон, розмарин, овощи гриль.",
    allergens: ["рыба"],
    vegetarian: false,
    spicy: false,
  },
  {
    id: "pollo-limone",
    name: "Курица с лимоном и каперсами",
    nameIt: "Pollo al limone",
    category: "secondi",
    price: 1190,
    portion: "320 г",
    description: "Филе корнишона, лимонно-масляный соус, каперсы, картофель с розмарином.",
    allergens: ["молоко"],
    vegetarian: false,
    spicy: false,
  },
  {
    id: "melanzane",
    name: "Пармиджана из баклажанов",
    nameIt: "Melanzane alla parmigiana",
    category: "secondi",
    price: 890,
    portion: "300 г",
    description: "Баклажаны, томатный соус, моцарелла, пармезан, базилик. Запекается в печи.",
    allergens: ["молоко"],
    vegetarian: true,
    spicy: false,
  },

  // --- Dolci ---
  {
    id: "tiramisu",
    name: "Тирамису",
    nameIt: "Tiramisù",
    category: "dolci",
    price: 590,
    portion: "180 г",
    description: "Маскарпоне, савоярди, эспрессо, какао. Готовим каждое утро.",
    allergens: ["глютен", "яйцо", "молоко"],
    vegetarian: true,
    spicy: false,
    featured: true,
  },
  {
    id: "panna-cotta",
    name: "Панна котта",
    nameIt: "Panna cotta",
    category: "dolci",
    price: 490,
    portion: "160 г",
    description: "Сливочный крем с ванилью Бурбон и соусом из лесных ягод.",
    allergens: ["молоко"],
    vegetarian: true,
    spicy: false,
  },
  {
    id: "cannoli",
    name: "Канноли сицилийские",
    nameIt: "Cannoli siciliani",
    category: "dolci",
    price: 520,
    portion: "2 шт.",
    description: "Хрустящие трубочки с кремом из рикотты, цукаты и фисташка.",
    allergens: ["глютен", "молоко", "орехи", "яйцо"],
    vegetarian: true,
    spicy: false,
  },

  // --- Bevande ---
  {
    id: "espresso",
    name: "Эспрессо",
    nameIt: "Caffè espresso",
    category: "bevande",
    price: 190,
    portion: "40 мл",
    description: "Обжарка нашего собственного бленда, 100% арабика.",
    allergens: [],
    vegetarian: true,
    spicy: false,
  },
  {
    id: "aperol",
    name: "Апероль шприц",
    nameIt: "Aperol Spritz",
    category: "bevande",
    price: 690,
    portion: "300 мл",
    description: "Апероль, просекко, содовая, апельсин. 11%.",
    allergens: [],
    vegetarian: true,
    spicy: false,
  },
  {
    id: "chianti-glass",
    name: "Кьянти Классико, бокал",
    nameIt: "Chianti Classico",
    category: "bevande",
    price: 780,
    portion: "150 мл",
    description: "Тоскана, санджовезе, DOCG. Сухое красное, 13,5%.",
    allergens: [],
    vegetarian: true,
    spicy: false,
  },
  {
    id: "limonata",
    name: "Домашний лимонад",
    nameIt: "Limonata della casa",
    category: "bevande",
    price: 390,
    portion: "400 мл",
    description: "Сицилийский лимон, мята, базилик, лёд.",
    allergens: [],
    vegetarian: true,
    spicy: false,
  },
];

const BY_ID = new Map(MENU.map((item) => [item.id, item]));

export function getMenuItem(id: string): MenuItem | undefined {
  return BY_ID.get(id);
}

export function itemsByCategory(category: CategoryId): MenuItem[] {
  return MENU.filter((item) => item.category === category);
}

export function featuredItems(): MenuItem[] {
  return MENU.filter((item) => item.featured);
}

export function formatPrice(rub: number): string {
  return `${rub.toLocaleString("ru-RU")} ₽`;
}
