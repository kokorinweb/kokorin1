"""Ниши бизнеса: что искать, когда пользователь вбивает «кофейни» или «барбершопы».

Каждая ниша знает, какими тегами её искать в OpenStreetMap и какими словами —
в Яндексе и 2ГИС. Незнакомый текст превращается в «свободную» нишу: поиск по
названию в OSM и полнотекстовый запрос в каталогах.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from utils.normalization import normalize_business_name


@dataclass(frozen=True)
class Niche:
    key: str
    title: str
    #: как пользователь может её назвать
    synonyms: tuple[str, ...] = ()
    #: селекторы тегов Overpass, например ["amenity"="dentist"]
    osm_filters: tuple[str, ...] = ()
    #: слова для полнотекстового поиска в Яндексе и 2ГИС
    search_terms: tuple[str, ...] = ()
    #: общепит? от этого зависят специфичные стоп-слова и категоризация
    food: bool = False
    #: свободная ниша, собранная из произвольного текста
    custom: bool = False

    @property
    def label(self) -> str:
        return self.title


#: общепит целиком — поведение по умолчанию, как в исходном ТЗ
FOOD_NICHE = Niche(
    key="food",
    title="Общепит (рестораны, кафе, бары, кофейни)",
    synonyms=(
        "общепит", "еда", "ресторан", "рестораны", "кафе", "бар", "бары",
        "food", "restaurants", "заведения", "хорека", "horeca",
    ),
    osm_filters=(
        '["amenity"~"^(restaurant|cafe|bar|pub|biergarten|food_court|fast_food)$"]',
    ),
    search_terms=("ресторан", "кафе", "бар", "кофейня"),
    food=True,
)

NICHES: tuple[Niche, ...] = (
    FOOD_NICHE,
    Niche("coffee", "Кофейни",
          ("кофейня", "кофейни", "кофе", "coffee", "кофе с собой"),
          ('["amenity"="cafe"]["cuisine"~"coffee"]', '["shop"="coffee"]'),
          ("кофейня", "кофе с собой"), food=True),
    Niche("bakery", "Пекарни и кондитерские",
          ("пекарня", "пекарни", "кондитерская", "кондитерские", "выпечка", "торты"),
          ('["shop"~"^(bakery|pastry|confectionery|chocolate)$"]',),
          ("пекарня", "кондитерская"), food=True),
    Niche("bar", "Бары и пабы",
          ("бар", "бары", "паб", "пабы", "гастробар", "пивная"),
          ('["amenity"~"^(bar|pub|biergarten)$"]',),
          ("бар", "паб", "гастробар"), food=True),
    Niche("beauty", "Салоны красоты",
          ("салон красоты", "салоны красоты", "красота", "бьюти", "beauty", "ногти", "маникюр"),
          ('["shop"="beauty"]', '["leisure"="beauty"]'),
          ("салон красоты", "маникюр", "косметология")),
    Niche("barbershop", "Барбершопы и парикмахерские",
          ("барбершоп", "барбершопы", "парикмахерская", "парикмахерские", "стрижка", "barbershop"),
          ('["shop"="hairdresser"]',),
          ("барбершоп", "парикмахерская")),
    Niche("dentist", "Стоматологии",
          ("стоматология", "стоматологии", "зубной", "дантист", "dentist"),
          ('["amenity"="dentist"]', '["healthcare"="dentist"]'),
          ("стоматология", "стоматологическая клиника")),
    Niche("clinic", "Медицинские клиники",
          ("клиника", "клиники", "медцентр", "медицинский центр", "поликлиника", "медицина"),
          ('["amenity"~"^(clinic|doctors)$"]', '["healthcare"~"^(centre|clinic|doctor)$"]'),
          ("медицинский центр", "частная клиника")),
    Niche("vet", "Ветклиники",
          ("ветклиника", "ветклиники", "ветеринар", "ветеринарная", "vet"),
          ('["amenity"="veterinary"]',),
          ("ветеринарная клиника",)),
    Niche("fitness", "Фитнес и спортзалы",
          ("фитнес", "спортзал", "тренажерный зал", "качалка", "gym", "фитнес-клуб"),
          ('["leisure"~"^(fitness_centre|sports_centre)$"]',),
          ("фитнес-клуб", "тренажерный зал")),
    Niche("yoga", "Йога и студии растяжки",
          ("йога", "пилатес", "растяжка", "стретчинг"),
          ('["leisure"="fitness_centre"]["sport"~"yoga|pilates"]',),
          ("студия йоги", "пилатес")),
    Niche("hotel", "Отели и гостиницы",
          ("отель", "отели", "гостиница", "гостиницы", "хостел", "апарт", "hotel"),
          ('["tourism"~"^(hotel|hostel|guest_house|apartment|motel)$"]',),
          ("отель", "гостиница", "хостел")),
    Niche("auto_repair", "Автосервисы",
          ("автосервис", "автосервисы", "сто", "ремонт авто", "автомастерская", "шиномонтаж"),
          ('["shop"~"^(car_repair|tyres)$"]',),
          ("автосервис", "шиномонтаж")),
    Niche("car_wash", "Автомойки",
          ("автомойка", "автомойки", "мойка"),
          ('["amenity"="car_wash"]',),
          ("автомойка",)),
    Niche("law", "Юристы и адвокаты",
          ("юрист", "юристы", "адвокат", "юридические услуги", "юрфирма"),
          ('["office"="lawyer"]',),
          ("юридические услуги", "адвокат")),
    Niche("accounting", "Бухгалтерские услуги",
          ("бухгалтер", "бухгалтерия", "бухучет", "аутсорсинг бухгалтерии"),
          ('["office"="accountant"]',),
          ("бухгалтерские услуги",)),
    Niche("realty", "Агентства недвижимости",
          ("недвижимость", "риелтор", "риэлтор", "агентство недвижимости"),
          ('["office"="estate_agent"]',),
          ("агентство недвижимости", "риелтор")),
    Niche("travel", "Турагентства",
          ("турагентство", "туризм", "туры", "турфирма"),
          ('["shop"="travel_agency"]', '["office"="travel_agent"]'),
          ("турагентство", "туры")),
    Niche("education", "Школы, курсы, репетиторы",
          ("курсы", "школа", "обучение", "репетитор", "языковая школа", "образование"),
          ('["amenity"~"^(language_school|driving_school|training|college)$"]',
           '["office"="educational_institution"]'),
          ("языковые курсы", "учебный центр", "автошкола")),
    Niche("kindergarten", "Частные детские сады и центры",
          ("детский сад", "садик", "детский центр", "развивающий центр"),
          ('["amenity"="kindergarten"]',),
          ("частный детский сад", "детский развивающий центр")),
    Niche("flowers", "Цветочные магазины",
          ("цветы", "цветочный", "флорист", "букеты"),
          ('["shop"="florist"]',),
          ("цветы", "доставка букетов")),
    Niche("pharmacy", "Аптеки",
          ("аптека", "аптеки"),
          ('["amenity"="pharmacy"]',),
          ("аптека",)),
    Niche("photo", "Фотостудии",
          ("фотостудия", "фотограф", "фотосалон", "фотосъемка"),
          ('["shop"="photo"]', '["craft"="photographer"]'),
          ("фотостудия", "фотограф")),
    Niche("print", "Типографии и полиграфия",
          ("типография", "полиграфия", "печать", "копицентр"),
          ('["shop"="copyshop"]', '["craft"="printer"]'),
          ("типография", "полиграфия")),
    Niche("construction", "Строительство и ремонт",
          ("строительство", "ремонт квартир", "отделка", "строительная компания", "прораб"),
          ('["craft"~"^(builder|carpenter|electrician|plumber|painter)$"]',
           '["office"="construction_company"]'),
          ("ремонт квартир", "строительная компания")),
    Niche("furniture", "Мебель на заказ",
          ("мебель", "кухни на заказ", "шкафы", "мебельный"),
          ('["shop"="furniture"]', '["craft"="cabinet_maker"]'),
          ("мебель на заказ", "кухни на заказ")),
    Niche("event", "Организация мероприятий",
          ("мероприятия", "ивент", "event", "праздники", "банкеты", "свадьбы"),
          ('["office"="event_management"]', '["shop"="party"]'),
          ("организация мероприятий", "свадебное агентство")),
    Niche("tattoo", "Тату-салоны",
          ("тату", "татуировка", "тату-салон", "tattoo"),
          ('["shop"="tattoo"]',),
          ("тату-салон",)),
    Niche("pets", "Зоомагазины и груминг",
          ("зоомагазин", "груминг", "зоотовары", "питомцы"),
          ('["shop"~"^(pet|pet_grooming)$"]',),
          ("зоомагазин", "груминг")),
    Niche("cleaning", "Клининг",
          ("клининг", "уборка", "химчистка"),
          ('["shop"="laundry"]', '["shop"="dry_cleaning"]', '["office"="cleaning"]'),
          ("клининговая компания", "химчистка")),
)

_BY_KEY = {n.key: n for n in NICHES}


def _norm(text: str) -> str:
    text = (text or "").lower().replace("ё", "е")
    text = re.sub(r"[^0-9a-zа-я ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _overpass_escape(text: str) -> str:
    """Чистит пользовательский ввод перед подстановкой в Overpass-регулярку."""
    return re.sub(r"[^0-9A-Za-zА-Яа-яЁё \-]", "", text or "").strip()


def custom_niche(text: str) -> Niche:
    """Ниша из произвольного текста: ищем по названию в OSM, по словам — в каталогах."""
    clean = _overpass_escape(text)
    filters: tuple[str, ...] = ()
    if len(clean) >= 3:
        filters = (f'["name"~"{clean}",i]',)
    return Niche(
        key="custom",
        title=text.strip() or "произвольный запрос",
        osm_filters=filters,
        search_terms=(text.strip(),) if text.strip() else (),
        custom=True,
    )


def resolve_niche(text: str | None) -> Niche:
    """Текст пользователя -> ниша. Пустой ввод = общепит."""
    if not text or not text.strip():
        return FOOD_NICHE
    query = _norm(text)
    if query in _BY_KEY:
        return _BY_KEY[query]

    for niche in NICHES:
        if query == _norm(niche.title):
            return niche
        for synonym in niche.synonyms:
            if query == _norm(synonym):
                return niche
    # частичное совпадение: «ищу барбершопы» -> барбершоп
    for niche in NICHES:
        for synonym in niche.synonyms:
            normalized = _norm(synonym)
            if normalized and (normalized in query or query in normalized):
                return niche
    return custom_niche(text)


def suggest_niches(limit: int = 0) -> list[Niche]:
    """Список ниш для подсказки в интерактивном режиме."""
    items = list(NICHES)
    return items[:limit] if limit else items


def niche_category(niche: Niche, raw_category: str = "", name: str = "") -> str:
    """Категория записи: для общепита — детальная, для прочих ниш — ключ ниши."""
    if niche.food:
        from sources.categories import map_category

        return map_category(name, raw_category)
    return niche.key


def normalized_niche_title(niche: Niche) -> str:
    return normalize_business_name(niche.title) or niche.key
