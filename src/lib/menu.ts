/**
 * Единственный источник правды по меню.
 * Его читают: витрина, фильтры, корзина, валидация заказа, предзаказ к брони,
 * ИИ-консультант и Telegram-бот. Меняешь цену здесь — она меняется везде.
 */

export type CategoryId =
  | "rolls"
  | "sushi"
  | "sets"
  | "sashimi"
  | "hot"
  | "soups"
  | "salads"
  | "starters"
  | "desserts"
  | "drinks";

/** Фильтры витрины. Один и тот же список рисует чипсы и фильтрует выдачу. */
export type Tag = "spicy" | "veggie" | "salmon" | "tuna" | "baked" | "new";

export type Allergen =
  | "глютен"
  | "молоко"
  | "яйцо"
  | "орехи"
  | "рыба"
  | "морепродукты"
  | "соя"
  | "кунжут";

/**
 * Какую картинку рисовать, если фотографии нет.
 * `kind` выбирает форму, `colors` — начинку и топпинг. Смотри components/DishArt.tsx.
 */
export type ArtKind =
  | "maki"
  | "nigiri"
  | "gunkan"
  | "sashimi"
  | "board"
  | "bowl"
  | "plate"
  | "glass"
  | "sweet";

/** Чем обёрнут ролл снаружи: нори или ломтики рыбы (как у Филадельфии). */
export type Wrap = "nori" | "fish";

export type DishArt = {
  kind: ArtKind;
  /** [начинка, акцент начинки, топпинг/соус] — HEX. */
  colors: [string, string, string];
  wrap?: Wrap;
};

export type SetMeta = {
  pieces: number;
  serves: string;
  contents: string[];
};

export type MenuItem = {
  id: string;
  name: string;
  /** Транскрипция или японское название — выводим мелким шрифтом под именем. */
  nameJp: string;
  category: CategoryId;
  /** Цена в рублях, целое число. Никаких дробей — меньше ошибок округления. */
  price: number;
  /** Вес или объём порции. */
  weight: string;
  /** Количество кусочков, если применимо. */
  pieces?: number;
  /** Одна фраза для карточки и для ИИ. */
  description: string;
  /** Состав — то, что гость реально хочет прочитать перед заказом. */
  composition: string[];
  tags: Tag[];
  allergens: Allergen[];
  art: DishArt;
  /** Путь к фотографии в /public. Если задан — рисуем фото вместо SVG. */
  image?: string;
  /** Показывать в блоке «Популярное» на главной. */
  featured?: boolean;
  /** Авторское блюдо шефа. */
  chef?: boolean;
  setMeta?: SetMeta;
};

export const CATEGORIES: { id: CategoryId; title: string; jp: string; subtitle: string }[] = [
  { id: "rolls", title: "Роллы", jp: "巻き", subtitle: "Классика и авторские" },
  { id: "sushi", title: "Суши", jp: "寿司", subtitle: "Нигири и гунканы" },
  { id: "sets", title: "Сеты", jp: "セット", subtitle: "Готовые наборы" },
  { id: "sashimi", title: "Сашими", jp: "刺身", subtitle: "Только рыба и нож" },
  { id: "hot", title: "Горячее", jp: "温物", subtitle: "С огня и из фритюра" },
  { id: "soups", title: "Супы", jp: "汁物", subtitle: "Бульоны на каждый день" },
  { id: "salads", title: "Салаты", jp: "サラダ", subtitle: "Лёгкое начало" },
  { id: "starters", title: "Закуски", jp: "前菜", subtitle: "К саке и пиву" },
  { id: "desserts", title: "Десерты", jp: "甘味", subtitle: "Не приторно" },
  { id: "drinks", title: "Напитки", jp: "飲み物", subtitle: "Чай, саке, лимонад" },
];

export const TAGS: { id: Tag; label: string }[] = [
  { id: "spicy", label: "Острые" },
  { id: "veggie", label: "Без мяса" },
  { id: "salmon", label: "С лососем" },
  { id: "tuna", label: "С тунцом" },
  { id: "baked", label: "Запечённые" },
  { id: "new", label: "Новинки" },
];

/** Палитры для SVG-графики. Держим отдельно, чтобы блюда одной группы не разъезжались. */
const ART = {
  salmon: ["#F08A5D", "#FFB68A", "#2E7D5B"] as [string, string, string],
  tuna: ["#C0392B", "#E8604C", "#2E7D5B"] as [string, string, string],
  eel: ["#8A5427", "#C08A4A", "#3E6B4A"] as [string, string, string],
  crab: ["#E8A33D", "#F7C873", "#C0392B"] as [string, string, string],
  veg: ["#7FA65A", "#B6D18A", "#E8C547"] as [string, string, string],
  shrimp: ["#EE8168", "#FFC0A8", "#E8C547"] as [string, string, string],
  scallop: ["#E9D8C0", "#FFF3E2", "#C0392B"] as [string, string, string],
  special: ["#F0855A", "#E9D8C0", "#3E6B4A"] as [string, string, string],
  ikra: ["#FF6B2C", "#FF9A5E", "#1C1C20"] as [string, string, string],
  broth: ["#C9682B", "#E89B4C", "#7FA65A"] as [string, string, string],
  miso: ["#A9793A", "#D2A45E", "#7FA65A"] as [string, string, string],
  matcha: ["#5E8C4A", "#9BC275", "#F4EDE2"] as [string, string, string],
  sake: ["#F4EDE2", "#FFFFFF", "#C9A227"] as [string, string, string],
  soda: ["#7EC8D8", "#B8E5EF", "#F4EDE2"] as [string, string, string],
  beer: ["#D9A02B", "#F0C860", "#F4EDE2"] as [string, string, string],
  sweet: ["#E8B9C8", "#F7DCE5", "#5E8C4A"] as [string, string, string],
};

export const MENU: MenuItem[] = [
  // ─────────────────────────── Роллы ───────────────────────────
  {
    id: "philadelphia",
    name: "Филадельфия",
    nameJp: "フィラデルフィア",
    category: "rolls",
    price: 1090,
    weight: "250 г",
    pieces: 8,
    description: "Тот самый ролл, по которому проверяют кухню: лосось охлаждённый, не мороженый.",
    composition: ["лосось", "сливочный сыр", "огурец", "рис", "нори"],
    tags: ["salmon"],
    allergens: ["рыба", "молоко", "соя"],
    art: { kind: "maki", colors: ART.salmon, wrap: "fish" },
    featured: true,
  },
  {
    id: "nori-special",
    name: "Нори Special",
    nameJp: "海苔スペシャル",
    category: "rolls",
    price: 1290,
    weight: "280 г",
    pieces: 8,
    description: "Авторский ролл шефа: лосось, гребешок и трюфельный понзу поверх тёплого риса.",
    composition: ["лосось", "гребешок", "авокадо", "трюфельный понзу", "икра тобико"],
    tags: ["salmon", "new"],
    allergens: ["рыба", "морепродукты", "соя"],
    art: { kind: "maki", colors: ART.special, wrap: "fish" },
    featured: true,
    chef: true,
  },
  {
    id: "baked-eel",
    name: "Запечённый ролл с угрём",
    nameJp: "焼きうなぎ巻き",
    category: "rolls",
    price: 990,
    weight: "240 г",
    pieces: 8,
    description: "Под сырной шапкой, из печи — подаём горячим, поэтому едят его первым.",
    composition: ["угорь унаги", "сливочный сыр", "огурец", "соус унаги", "кунжут"],
    tags: ["baked"],
    allergens: ["рыба", "молоко", "соя", "кунжут"],
    art: { kind: "maki", colors: ART.eel },
    featured: true,
  },
  {
    id: "baked-crab",
    name: "Запечённый краб спайси",
    nameJp: "焼きカニ辛口",
    category: "rolls",
    price: 890,
    weight: "230 г",
    pieces: 8,
    description: "Крабовая шапка со спайси-соусом, запечённая до румяной корки.",
    composition: ["краб", "спайси-соус", "огурец", "унаги", "зелёный лук"],
    tags: ["baked", "spicy"],
    allergens: ["морепродукты", "яйцо", "соя"],
    art: { kind: "maki", colors: ART.crab },
  },
  {
    id: "california",
    name: "Калифорния с крабом",
    nameJp: "カリフォルニア",
    category: "rolls",
    price: 790,
    weight: "240 г",
    pieces: 8,
    description: "Классика в икре тобико: мягкий краб, авокадо и огурец.",
    composition: ["краб", "авокадо", "огурец", "икра тобико", "рис"],
    tags: [],
    allergens: ["морепродукты", "рыба", "соя"],
    art: { kind: "maki", colors: ART.ikra, wrap: "fish" },
  },
  {
    id: "spicy-tuna",
    name: "Спайси тунец",
    nameJp: "辛口マグロ",
    category: "rolls",
    price: 940,
    weight: "220 г",
    pieces: 8,
    description: "Тунец с острым соусом на основе японского майонеза и togarashi.",
    composition: ["тунец", "спайси-соус", "огурец", "зелёный лук", "нори"],
    tags: ["tuna", "spicy"],
    allergens: ["рыба", "яйцо", "соя"],
    art: { kind: "maki", colors: ART.tuna },
  },
  {
    id: "dragon",
    name: "Дракон с угрём",
    nameJp: "ドラゴン",
    category: "rolls",
    price: 1190,
    weight: "270 г",
    pieces: 8,
    description: "Угорь и авокадо чешуёй сверху, соус унаги и кунжут.",
    composition: ["угорь унаги", "авокадо", "креветка темпура", "соус унаги", "кунжут"],
    tags: [],
    allergens: ["рыба", "морепродукты", "глютен", "кунжут", "соя"],
    art: { kind: "maki", colors: ART.eel, wrap: "fish" },
  },
  {
    id: "veggie-roll",
    name: "Овощной с манго",
    nameJp: "野菜巻き",
    category: "rolls",
    price: 640,
    weight: "220 г",
    pieces: 8,
    description: "Авокадо, манго и хрустящий огурец — не «постный вариант», а самостоятельное блюдо.",
    composition: ["авокадо", "манго", "огурец", "салат", "кунжут"],
    tags: ["veggie"],
    allergens: ["соя", "кунжут"],
    art: { kind: "maki", colors: ART.veg },
  },
  {
    id: "salmon-mango",
    name: "Лосось и манго",
    nameJp: "サーモンマンゴー",
    category: "rolls",
    price: 990,
    weight: "240 г",
    pieces: 8,
    description: "Летний ролл: жирный лосось гасится кислым манго и понзу.",
    composition: ["лосось", "манго", "сливочный сыр", "понзу", "микрозелень"],
    tags: ["salmon", "new"],
    allergens: ["рыба", "молоко", "соя"],
    art: { kind: "maki", colors: ART.salmon, wrap: "fish" },
  },
  {
    id: "tempura-roll",
    name: "Темпура с креветкой",
    nameJp: "海老天巻き",
    category: "rolls",
    price: 890,
    weight: "230 г",
    pieces: 8,
    description: "Во фритюре: снаружи хруст, внутри тёплая креветка и сыр.",
    composition: ["креветка", "сливочный сыр", "кляр темпура", "соус спайси"],
    tags: ["baked"],
    allergens: ["морепродукты", "глютен", "яйцо", "молоко"],
    art: { kind: "maki", colors: ART.shrimp },
  },

  // ─────────────────────────── Суши ───────────────────────────
  {
    id: "nigiri-salmon",
    name: "Сяке",
    nameJp: "鮭 · лосось",
    category: "sushi",
    price: 240,
    weight: "40 г",
    pieces: 1,
    description: "Лосось на тёплом рисе с каплей васаби между рыбой и рисом.",
    composition: ["лосось", "рис", "васаби"],
    tags: ["salmon"],
    allergens: ["рыба"],
    art: { kind: "nigiri", colors: ART.salmon },
  },
  {
    id: "nigiri-tuna",
    name: "Магуро",
    nameJp: "鮪 · тунец",
    category: "sushi",
    price: 290,
    weight: "40 г",
    pieces: 1,
    description: "Спинка тунца, плотная и чистая по вкусу.",
    composition: ["тунец", "рис", "васаби"],
    tags: ["tuna"],
    allergens: ["рыба"],
    art: { kind: "nigiri", colors: ART.tuna },
  },
  {
    id: "nigiri-eel",
    name: "Унаги",
    nameJp: "鰻 · угорь",
    category: "sushi",
    price: 320,
    weight: "45 г",
    pieces: 1,
    description: "Копчёный угорь, соус унаги, кунжут.",
    composition: ["угорь", "рис", "соус унаги", "кунжут"],
    tags: [],
    allergens: ["рыба", "соя", "кунжут"],
    art: { kind: "nigiri", colors: ART.eel },
  },
  {
    id: "nigiri-shrimp",
    name: "Эби",
    nameJp: "海老 · креветка",
    category: "sushi",
    price: 260,
    weight: "40 г",
    pieces: 1,
    description: "Тигровая креветка, раскрытая на рисовой подушке.",
    composition: ["креветка", "рис", "васаби"],
    tags: [],
    allergens: ["морепродукты"],
    art: { kind: "nigiri", colors: ART.shrimp },
  },
  {
    id: "nigiri-scallop",
    name: "Хотатэ",
    nameJp: "帆立 · гребешок",
    category: "sushi",
    price: 350,
    weight: "40 г",
    pieces: 1,
    description: "Сладкий гребешок с цедрой юдзу и морской солью.",
    composition: ["гребешок", "рис", "юдзу", "морская соль"],
    tags: ["new"],
    allergens: ["морепродукты"],
    art: { kind: "nigiri", colors: ART.scallop },
  },
  {
    id: "gunkan-ikra",
    name: "Гункан с икрой лосося",
    nameJp: "いくら軍艦",
    category: "sushi",
    price: 390,
    weight: "45 г",
    pieces: 1,
    description: "Икра лосося в поясе из нори — солёно, ярко, на один укус.",
    composition: ["икра лосося", "рис", "нори"],
    tags: ["salmon"],
    allergens: ["рыба"],
    art: { kind: "gunkan", colors: ART.ikra },
  },

  // ─────────────────────────── Сеты ───────────────────────────
  {
    id: "set-two",
    name: "SET №1 · Для двоих",
    nameJp: "二人前セット",
    category: "sets",
    price: 2490,
    weight: "1150 г",
    pieces: 32,
    description: "Ужин на двоих без выбора и споров: четыре ролла и нигири.",
    composition: ["Филадельфия", "Калифорния", "Овощной с манго", "Спайси тунец", "нигири сяке ×4"],
    tags: ["salmon"],
    allergens: ["рыба", "молоко", "морепродукты", "соя"],
    art: { kind: "board", colors: ART.salmon },
    featured: true,
    setMeta: {
      pieces: 32,
      serves: "для двоих",
      contents: ["Филадельфия", "Калифорния", "Овощной с манго", "Спайси тунец", "Нигири сяке ×4"],
    },
  },
  {
    id: "set-company",
    name: "SET №2 · Большая компания",
    nameJp: "パーティーセット",
    category: "sets",
    price: 4990,
    weight: "2300 г",
    pieces: 64,
    description: "Восемь роллов на большой доске — то, что заказывают на день рождения.",
    composition: [
      "Филадельфия",
      "Калифорния",
      "Дракон",
      "Запечённый краб",
      "Темпура с креветкой",
      "Спайси тунец",
      "Овощной с манго",
      "Лосось и манго",
    ],
    tags: ["baked"],
    allergens: ["рыба", "молоко", "морепродукты", "глютен", "соя"],
    art: { kind: "board", colors: ART.crab },
    setMeta: {
      pieces: 64,
      serves: "для компании 4–6 человек",
      contents: [
        "Филадельфия",
        "Калифорния",
        "Дракон",
        "Запечённый краб",
        "Темпура с креветкой",
        "Спайси тунец",
        "Овощной с манго",
        "Лосось и манго",
      ],
    },
  },
  {
    id: "set-salmon",
    name: "SET №3 · Salmon",
    nameJp: "サーモンセット",
    category: "sets",
    price: 2890,
    weight: "1400 г",
    pieces: 40,
    description: "Для тех, кто пришёл только за лососем. Пять позиций, ни одной лишней.",
    composition: ["Филадельфия", "Лосось и манго", "Нори Special", "нигири сяке ×4", "сашими лосось"],
    tags: ["salmon"],
    allergens: ["рыба", "молоко", "морепродукты", "соя"],
    art: { kind: "board", colors: ART.salmon },
    setMeta: {
      pieces: 40,
      serves: "для двоих",
      contents: ["Филадельфия", "Лосось и манго", "Нори Special", "Нигири сяке ×4", "Сашими лосось"],
    },
  },
  {
    id: "set-hot",
    name: "SET №4 · Hot",
    nameJp: "ホットセット",
    category: "sets",
    price: 2690,
    weight: "1250 г",
    pieces: 36,
    description: "Всё горячее и запечённое, приезжает к столу дымящимся.",
    composition: ["Запечённый ролл с угрём", "Запечённый краб спайси", "Темпура с креветкой", "Гёдза"],
    tags: ["baked", "spicy"],
    allergens: ["рыба", "молоко", "морепродукты", "глютен", "яйцо"],
    art: { kind: "board", colors: ART.eel },
    setMeta: {
      pieces: 36,
      serves: "для двоих, любителям горячего",
      contents: [
        "Запечённый ролл с угрём",
        "Запечённый краб спайси",
        "Темпура с креветкой",
        "Гёдза с курицей",
      ],
    },
  },

  // ─────────────────────────── Сашими ───────────────────────────
  {
    id: "sashimi-salmon",
    name: "Сашими лосось",
    nameJp: "鮭刺身",
    category: "sashimi",
    price: 890,
    weight: "120 г",
    pieces: 6,
    description: "Шесть срезов охлаждённого лосося, соевый соус и васаги отдельно.",
    composition: ["лосось", "дайкон", "васаби", "соевый соус"],
    tags: ["salmon"],
    allergens: ["рыба", "соя"],
    art: { kind: "sashimi", colors: ART.salmon },
    featured: true,
  },
  {
    id: "sashimi-tuna",
    name: "Сашими тунец",
    nameJp: "鮪刺身",
    category: "sashimi",
    price: 990,
    weight: "120 г",
    pieces: 6,
    description: "Тунец из спинной части — плотный, почти без жира.",
    composition: ["тунец", "дайкон", "васаби", "соевый соус"],
    tags: ["tuna"],
    allergens: ["рыба", "соя"],
    art: { kind: "sashimi", colors: ART.tuna },
  },
  {
    id: "sashimi-scallop",
    name: "Сашими гребешок",
    nameJp: "帆立刺身",
    category: "sashimi",
    price: 1090,
    weight: "110 г",
    pieces: 6,
    description: "Гребешок с юдзу-солью — сладко и почти без вмешательства.",
    composition: ["гребешок", "юдзу", "морская соль", "оливковое масло"],
    tags: ["new"],
    allergens: ["морепродукты"],
    art: { kind: "sashimi", colors: ART.scallop },
  },
  {
    id: "sashimi-set",
    name: "Сашими-ассорти",
    nameJp: "刺身盛り合わせ",
    category: "sashimi",
    price: 1890,
    weight: "260 г",
    pieces: 15,
    description: "Лосось, тунец, гребешок и угорь на льду. Лучший способ проверить рыбу.",
    composition: ["лосось", "тунец", "гребешок", "угорь", "дайкон"],
    tags: ["salmon", "tuna"],
    allergens: ["рыба", "морепродукты", "соя"],
    art: { kind: "sashimi", colors: ART.tuna },
  },

  // ─────────────────────────── Горячее ───────────────────────────
  {
    id: "shrimp-tempura",
    name: "Креветки темпура",
    nameJp: "海老天ぷら",
    category: "hot",
    price: 790,
    weight: "180 г",
    pieces: 5,
    description: "Пять тигровых креветок в лёгком кляре, соус тэнцую.",
    composition: ["тигровая креветка", "кляр темпура", "соус тэнцую", "дайкон"],
    tags: [],
    allergens: ["морепродукты", "глютен", "яйцо", "соя"],
    art: { kind: "plate", colors: ART.shrimp },
  },
  {
    id: "salmon-teriyaki",
    name: "Лосось терияки",
    nameJp: "鮭照り焼き",
    category: "hot",
    price: 1190,
    weight: "260 г",
    description: "Стейк лосося на гриле, глазурь терияки, зелёная спаржа.",
    composition: ["лосось", "соус терияки", "спаржа", "кунжут"],
    tags: ["salmon"],
    allergens: ["рыба", "соя", "кунжут"],
    art: { kind: "plate", colors: ART.salmon },
  },
  {
    id: "udon-chicken",
    name: "Удон с курицей",
    nameJp: "鶏うどん",
    category: "hot",
    price: 690,
    weight: "380 г",
    description: "Толстая пшеничная лапша вок с курицей и овощами.",
    composition: ["лапша удон", "курица", "болгарский перец", "соус вок", "кунжут"],
    tags: [],
    allergens: ["глютен", "соя", "кунжут"],
    art: { kind: "bowl", colors: ART.miso },
  },
  {
    id: "tuna-tataki",
    name: "Тунец татаки",
    nameJp: "鮪たたき",
    category: "hot",
    price: 1490,
    weight: "220 г",
    description: "Стейк тунца, обожжённый по краю, внутри сырой. Понзу и зелёный лук.",
    composition: ["тунец", "понзу", "зелёный лук", "кунжут", "чили"],
    tags: ["tuna", "spicy"],
    allergens: ["рыба", "соя", "кунжут"],
    art: { kind: "plate", colors: ART.tuna },
    chef: true,
  },
  {
    id: "gyoza-chicken",
    name: "Гёдза с курицей",
    nameJp: "餃子",
    category: "hot",
    price: 590,
    weight: "220 г",
    pieces: 6,
    description: "Обжаренные с одной стороны, на пару — с другой. Соус с чёрным уксусом.",
    composition: ["курица", "капуста", "тесто", "чёрный уксус", "имбирь"],
    tags: [],
    allergens: ["глютен", "соя"],
    art: { kind: "plate", colors: ART.crab },
  },

  // ─────────────────────────── Супы ───────────────────────────
  {
    id: "tom-yam",
    name: "Том Ям с морепродуктами",
    nameJp: "トムヤム",
    category: "soups",
    price: 790,
    weight: "400 мл",
    description: "Острый и кислый, на кокосовом молоке, с креветкой и мидиями.",
    composition: ["креветка", "мидии", "кокосовое молоко", "лемонграсс", "чили", "галангал"],
    tags: ["spicy"],
    allergens: ["морепродукты", "рыба"],
    art: { kind: "bowl", colors: ART.broth },
    featured: true,
  },
  {
    id: "miso-soup",
    name: "Мисо-суп",
    nameJp: "味噌汁",
    category: "soups",
    price: 320,
    weight: "300 мл",
    description: "Даси, паста мисо, тофу и вакамэ. Тот суп, с которого начинают.",
    composition: ["мисо-паста", "тофу", "водоросли вакамэ", "зелёный лук"],
    tags: ["veggie"],
    allergens: ["соя"],
    art: { kind: "bowl", colors: ART.miso },
  },
  {
    id: "duck-ramen",
    name: "Рамэн с уткой",
    nameJp: "鴨ラーメン",
    category: "soups",
    price: 890,
    weight: "550 мл",
    description: "Бульон варится 12 часов, утиная грудка режется на заказ.",
    composition: ["утиная грудка", "лапша рамэн", "яйцо аджитама", "нори", "зелёный лук"],
    tags: [],
    allergens: ["глютен", "яйцо", "соя"],
    art: { kind: "bowl", colors: ART.eel },
  },

  // ─────────────────────────── Салаты ───────────────────────────
  {
    id: "chuka",
    name: "Чука с ореховым соусом",
    nameJp: "チュカサラダ",
    category: "salads",
    price: 490,
    weight: "160 г",
    description: "Хрустящие водоросли, кунжутно-ореховый соус, лимон.",
    composition: ["водоросли чука", "ореховый соус", "кунжут", "лимон"],
    tags: ["veggie"],
    allergens: ["орехи", "кунжут", "соя"],
    art: { kind: "plate", colors: ART.veg },
  },
  {
    id: "salmon-avocado-salad",
    name: "Салат с лососем и авокадо",
    nameJp: "サーモンサラダ",
    category: "salads",
    price: 690,
    weight: "220 г",
    description: "Слабосолёный лосось, авокадо, микс салатов, заправка юдзу.",
    composition: ["лосось", "авокадо", "микс салатов", "юдзу", "кунжут"],
    tags: ["salmon"],
    allergens: ["рыба", "кунжут"],
    art: { kind: "plate", colors: ART.salmon },
  },
  {
    id: "kani-salad",
    name: "Кани салат",
    nameJp: "カニサラダ",
    category: "salads",
    price: 590,
    weight: "180 г",
    description: "Краб, огурец и хрустящая стружка с острым японским майонезом.",
    composition: ["краб", "огурец", "японский майонез", "чили", "тобико"],
    tags: ["spicy"],
    allergens: ["морепродукты", "яйцо", "рыба"],
    art: { kind: "plate", colors: ART.crab },
  },

  // ─────────────────────────── Закуски ───────────────────────────
  {
    id: "edamame",
    name: "Эдамамэ с морской солью",
    nameJp: "枝豆",
    category: "starters",
    price: 390,
    weight: "150 г",
    description: "Зелёные соевые бобы на пару. Самая честная закуска к пиву.",
    composition: ["соевые бобы", "морская соль"],
    tags: ["veggie"],
    allergens: ["соя"],
    art: { kind: "plate", colors: ART.veg },
  },
  {
    id: "takoyaki",
    name: "Такояки",
    nameJp: "たこ焼き",
    category: "starters",
    price: 590,
    weight: "180 г",
    pieces: 6,
    description: "Шарики с осьминогом, соус окономи и танцующая стружка тунца.",
    composition: ["осьминог", "тесто", "соус окономи", "стружка бонито", "японский майонез"],
    tags: [],
    allergens: ["морепродукты", "глютен", "яйцо", "рыба"],
    art: { kind: "plate", colors: ART.crab },
  },
  {
    id: "tuna-tartare",
    name: "Тартар из тунца",
    nameJp: "鮪タルタル",
    category: "starters",
    price: 890,
    weight: "160 г",
    description: "Тунец рубится ножом, кунжутное масло, чили, хрустящие рисовые чипсы.",
    composition: ["тунец", "кунжутное масло", "чили", "лук шалот", "рисовые чипсы"],
    tags: ["tuna", "spicy", "new"],
    allergens: ["рыба", "соя", "кунжут"],
    art: { kind: "plate", colors: ART.tuna },
    chef: true,
  },
  {
    id: "nasu-miso",
    name: "Баклажан в мисо",
    nameJp: "茄子味噌",
    category: "starters",
    price: 490,
    weight: "200 г",
    description: "Баклажан, запечённый под сладкой мисо-глазурью, кунжут.",
    composition: ["баклажан", "мисо-паста", "мирин", "кунжут"],
    tags: ["veggie", "baked"],
    allergens: ["соя", "кунжут"],
    art: { kind: "plate", colors: ART.miso },
  },

  // ─────────────────────────── Десерты ───────────────────────────
  {
    id: "mochi",
    name: "Моти ассорти",
    nameJp: "餅",
    category: "desserts",
    price: 490,
    weight: "150 г",
    pieces: 3,
    description: "Три вкуса: манго, матча, кокос. Подаём подмороженными.",
    composition: ["рисовое тесто", "мороженое", "манго", "матча", "кокос"],
    tags: ["veggie"],
    allergens: ["молоко", "глютен"],
    art: { kind: "sweet", colors: ART.sweet },
  },
  {
    id: "matcha-cheesecake",
    name: "Чизкейк матча",
    nameJp: "抹茶チーズケーキ",
    category: "desserts",
    price: 520,
    weight: "140 г",
    description: "Горчинка матчи вместо приторности. Песочная основа.",
    composition: ["сливочный сыр", "матча", "песочная основа", "сливки"],
    tags: ["veggie"],
    allergens: ["молоко", "глютен", "яйцо"],
    art: { kind: "sweet", colors: ART.matcha },
  },
  {
    id: "dorayaki",
    name: "Дораяки",
    nameJp: "どら焼き",
    category: "desserts",
    price: 420,
    weight: "130 г",
    pieces: 2,
    description: "Два японских панкейка с кремом из красной фасоли.",
    composition: ["панкейк", "паста адзуки", "сливки"],
    tags: ["veggie"],
    allergens: ["глютен", "яйцо", "молоко"],
    art: { kind: "sweet", colors: ART.sweet },
  },

  // ─────────────────────────── Напитки ───────────────────────────
  {
    id: "sake-gekkeikan",
    name: "Саке Gekkeikan",
    nameJp: "月桂冠",
    category: "drinks",
    price: 690,
    weight: "180 мл",
    description: "Подаём тёплым или холодным — скажите официанту, как любите.",
    composition: ["рисовое вино 14,5%"],
    tags: ["veggie"],
    allergens: [],
    art: { kind: "glass", colors: ART.sake },
  },
  {
    id: "matcha-latte",
    name: "Матча-латте",
    nameJp: "抹茶ラテ",
    category: "drinks",
    price: 390,
    weight: "300 мл",
    description: "Церемониальная матча, взбитая венчиком, на молоке или на овсяном.",
    composition: ["матча", "молоко на выбор"],
    tags: ["veggie"],
    allergens: ["молоко"],
    art: { kind: "glass", colors: ART.matcha },
  },
  {
    id: "ramune",
    name: "Лимонад Ramune",
    nameJp: "ラムネ",
    category: "drinks",
    price: 290,
    weight: "200 мл",
    description: "Та самая бутылка со стеклянным шариком. Оригинал из Японии.",
    composition: ["японский лимонад"],
    tags: ["veggie"],
    allergens: [],
    art: { kind: "glass", colors: ART.soda },
  },
  {
    id: "oolong-milk",
    name: "Улун молочный",
    nameJp: "烏龍茶",
    category: "drinks",
    price: 490,
    weight: "600 мл",
    description: "Чайник на двоих, доливаем кипяток бесплатно.",
    composition: ["чай улун"],
    tags: ["veggie"],
    allergens: [],
    art: { kind: "glass", colors: ART.matcha },
  },
  {
    id: "asahi",
    name: "Асахи Super Dry",
    nameJp: "アサヒ",
    category: "drinks",
    price: 420,
    weight: "330 мл",
    description: "Сухое японское пиво, которое не спорит с рыбой.",
    composition: ["пиво 5,0%"],
    tags: [],
    allergens: ["глютен"],
    art: { kind: "glass", colors: ART.beer },
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

export function chefItems(): MenuItem[] {
  return MENU.filter((item) => item.chef);
}

export function setItems(): MenuItem[] {
  return itemsByCategory("sets");
}

export function categoryMeta(id: CategoryId) {
  return CATEGORIES.find((category) => category.id === id);
}

/** 1090 → «1 090 ₽». Неразрывный пробел, чтобы цена не переносилась. */
export function formatPrice(value: number): string {
  return `${value.toLocaleString("ru-RU").replace(/\s/g, " ")} ₽`;
}

/** Строка «250 г · 8 шт» для карточки. */
export function portionLabel(item: MenuItem): string {
  return item.pieces ? `${item.weight} · ${item.pieces} шт` : item.weight;
}
