"""Отображение сырых категорий источников в наши категории + фильтр мусора."""
from __future__ import annotations

import re

from config import CATEGORIES

# --- ключевые слова -> наша категория (порядок важен: сначала специфичное) ---

_CATEGORY_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("steakhouse", ("стейк", "steak", "мясной ресторан", "гриль-хаус", "grill house")),
    ("sushi", ("суши", "sushi", "сашими", "японск", "japanese", "роллы", "wok & sushi")),
    ("georgian", ("грузинск", "georgian", "хинкал", "хачапур", "хинкальная", "чачa")),
    ("italian", ("итальянск", "italian", "траттория", "trattoria", "остерия", "osteria", "паста")),
    ("pizzeria", ("пиццери", "пицца", "pizza", "pizzeria")),
    ("asian", (
        "азиатск", "asian", "китайск", "chinese", "тайск", "thai", "вьетнамск",
        "vietnamese", "корейск", "korean", "паназиат", "wok", "лапшич", "рамен", "ramen",
        "узбекск", "uzbek", "чайхана", "чайхона", "индийск", "indian",
    )),
    ("coffee_shop", ("кофейн", "coffee", "кофе", "espresso", "эспрессо", "кофе с собой")),
    ("bakery_cafe", ("пекарн", "bakery", "кондитерск", "pastry", "булочная", "патисьер")),
    ("gastropub", ("гастробар", "gastropub", "гастропаб", "gastro bar", "винный бар", "wine bar",
                   "крафтовый бар", "коктейль-бар", "cocktail bar")),
    ("bar", ("бар", "bar", "паб", "pub", "пивная", "brewery", "пивоварня", "taproom")),
    ("family_restaurant", ("семейн", "family restaurant", "семейное кафе", "детское кафе")),
    ("restaurant", ("ресторан", "restaurant", "ресторация", "brasserie", "брассери", "fine dining")),
    ("bistro", ("бистро", "bistro", "столовая", "canteen", "закусочная", "буфет")),
    ("cafe", ("кафе", "cafe", "café", "кофе-бар", "антикафе", "чайная", "tea house")),
]

#: OSM amenity -> категория по умолчанию, если по названию/кухне не определилось
_OSM_AMENITY_DEFAULT = {
    "restaurant": "restaurant",
    "cafe": "cafe",
    "bar": "bar",
    "pub": "bar",
    "fast_food": "other_food",
    "food_court": "other_food",
    "ice_cream": "cafe",
    "biergarten": "bar",
}


def map_category(*hints: str | None) -> str:
    """Определяет нашу категорию по названию, кухне и рубрике источника."""
    blob = " ".join(h.lower() for h in hints if h)
    if not blob:
        return "other_food"
    for key, keywords in _CATEGORY_RULES:
        if any(word in blob for word in keywords):
            return key
    for amenity, key in _OSM_AMENITY_DEFAULT.items():
        if amenity in blob:
            return key
    return "other_food"


def category_label(key: str) -> str:
    return CATEGORIES.get(key, (key, False))[0]


# ---------------------------------------------------------------------------
# Что НЕ собираем
# ---------------------------------------------------------------------------

#: слова в названии, из-за которых заведение точно не наш лид
_NAME_BLOCKLIST = (
    "столовая №", "школьная столовая", "студенческая столовая", "столовая школы",
    "комбинат питания", "комбинат школьного питания", "фабрика-кухня", "фабрика кухня",
    "кейтеринг", "catering", "буфет №", "рабочая столовая", "столовая при",
    "фудтрак", "food truck", "фуд трак", "фудкорт", "food court",
    "киоск", "ларек", "ларёк", "павильон быстрого питания", "торговый павильон",
    "автомат", "vending", "вендинг", "кофейный автомат",
    "продукты", "продуктовый", "супермаркет", "гипермаркет", "минимаркет",
    "магазин", "универсам", "мясная лавка", "овощи фрукты", "табак",
    "dark kitchen", "дарк китчен", "cloud kitchen", "только доставка",
    "аптека", "автомойка", "шиномонтаж", "хостел", "общежитие",
    "закрыто", "закрыт", "не работает",
)

#: слова, указывающие на служебную/корпоративную точку питания
_INSTITUTIONAL_MARKERS = (
    "школа", "гимназия", "лицей", "детский сад", "университет", "институт",
    "колледж", "техникум", "больница", "поликлиника", "госпиталь",
    "воинская часть", "мчс", "министерств", "администрац", "завод", "фабрика",
    "бизнес-центр столовая", "при заводе", "при предприятии",
)

#: OSM-теги закрытых/несуществующих объектов
_CLOSED_TAG_PREFIXES = ("disused:", "was:", "abandoned:", "removed:", "demolished:", "razed:")

_MIN_NAME_LEN = 2


def name_is_generic(name: str) -> bool:
    """Название вида «Кафе», «Бар», «Столовая» — карточка без бренда."""
    stripped = re.sub(r"[^0-9a-zа-яё ]+", "", (name or "").lower()).strip()
    return stripped in {
        "кафе", "бар", "ресторан", "столовая", "буфет", "закусочная", "пиццерия",
        "кофейня", "чайная", "пельменная", "шаурма", "шаверма", "выпечка", "еда",
        "cafe", "bar", "restaurant", "food", "coffee", "кулинария", "фастфуд",
    }


def exclusion_reason(
    *,
    name: str,
    raw_category: str = "",
    tags: dict | None = None,
    address: str = "",
) -> str | None:
    """Возвращает причину исключения записи или None, если заведение подходит."""
    tags = tags or {}
    clean_name = (name or "").strip()
    if len(clean_name) < _MIN_NAME_LEN:
        return "нет названия"
    if name_is_generic(clean_name):
        return "безымянная точка (родовое название без бренда)"

    lowered = f"{clean_name} {raw_category}".lower()
    for marker in _NAME_BLOCKLIST:
        if marker in lowered:
            return f"стоп-слово в названии/рубрике: «{marker}»"

    address_blob = f"{clean_name} {address}".lower()
    if "столов" in lowered and any(m in address_blob for m in _INSTITUTIONAL_MARKERS):
        return "столовая при организации/учебном заведении"

    for key in tags:
        if any(str(key).startswith(prefix) for prefix in _CLOSED_TAG_PREFIXES):
            return "объект помечен как закрытый/несуществующий"

    for key in ("opening_hours", "operational_status", "state"):
        value = str(tags.get(key, "")).lower()
        if value in ("closed", "no", "abandoned", "disused"):
            return "объект закрыт"

    # киоски и фудтраки в OSM
    if str(tags.get("amenity", "")) == "vending_machine":
        return "вендинговый автомат"
    if str(tags.get("food_truck", "")).lower() == "yes" or str(tags.get("mobile", "")).lower() == "yes":
        return "мобильная точка (фудтрак)"
    if str(tags.get("building", "")).lower() in ("kiosk", "container"):
        return "киоск/контейнер"
    if str(tags.get("shop", "")) in ("convenience", "supermarket", "grocery", "kiosk", "deli"):
        return "магазин, а не заведение общепита"
    if str(tags.get("takeaway", "")).lower() == "only" and not tags.get("website"):
        return "точка только на вынос без зала"

    return None
