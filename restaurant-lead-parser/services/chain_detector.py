"""Определение сетевых заведений.

Крупные федеральные сети — плохие лиды: сайт у них почти всегда есть, а решение
о разработке принимается централизованно. Нас интересуют независимые заведения
и небольшие локальные сети.
"""
from __future__ import annotations

from collections import defaultdict

from database.models import Place
from utils.normalization import normalize_business_name

#: известные федеральные и международные сети (нормализованные имена)
FEDERAL_CHAINS = {
    normalize_business_name(n)
    for n in (
        "Шоколадница", "Кофе Хауз", "Кофемания", "Стардогс", "Стардогз",
        "Додо Пицца", "Dodo Pizza", "Папа Джонс", "Papa John's", "Pizza Hut",
        "Domino's Pizza", "Доминос Пицца", "Сбарро", "Sbarro", "Il Patio",
        "Планета Суши", "Тануки", "Якитория", "Суши Wok", "Суши Шоп", "Sushi Shop",
        "Ёбидоёби", "Осьминог", "Роллы Хауз", "Суши Мастер", "Sushi Master",
        "Теремок", "Крошка Картошка", "Му-Му", "Грабли", "Вилка-Ложка",
        "Бургер Кинг", "Burger King", "KFC", "Ростикс", "Rostic's",
        "McDonald's", "Макдоналдс", "Вкусно и точка", "Subway", "Сабвей",
        "Starbucks", "Старбакс", "Stars Coffee", "Cofix", "Кофикс",
        "One Price Coffee", "Coffee Like", "Кофе Лайк", "Skuratov Coffee",
        "Surf Coffee", "Даблби", "Double B", "Правда Кофе", "Cofefest", "Прайм",
        "Хлеб Насущный", "Cinnabon", "Синнабон", "Krispy Kreme", "Данкин Донатс",
        "Чайхона №1", "Тарас Бульба", "Вареничная №1", "Хачапури Тётушки Марико",
        "Шашлыкоff", "Харакири", "Евразия", "Две Палочки", "Гин-но Таки",
        "Мама Раша", "Черёмушки", "Бахрома", "Ташир Пицца", "Пицца Фабрика",
        "Домашняя Кухня", "Компот", "Пироговая Штолле", "Штолле", "Синнабон",
        "Обед Буфет", "Марукамэ", "Токио-Сити", "Виктория", "Фарш", "Воккер",
        "Кулинарная Лавка Братьев Караваевых", "Братья Караваевы", "Андерсон",
        "Шоколад", "Много Лосося", "Тарелка", "Блин.Дональтс", "Френдс Форевер",
        "Бургерная Farш", "Black Star Burger", "Тесто Место", "Пян-Се",
    )
} - {""}


def chain_verdict(place: Place, *, name_counts: dict[str, int] | None = None, threshold: int = 6) -> tuple[bool, str]:
    """Возвращает (это сеть, причина)."""
    norm = normalize_business_name(place.name)
    if norm and norm in FEDERAL_CHAINS:
        return True, "входит в список федеральных/международных сетей"

    brand_id = (place.evidence or {}).get("brand_id") or ""
    if brand_id:
        return True, f"у объекта проставлен бренд ({brand_id}) — сетевая точка"

    count = (name_counts or {}).get(norm, place.branch_count)
    if norm and count >= threshold:
        return True, f"найдено {count} одноимённых точек — сеть"

    return False, ""


def annotate_chains(places: list[Place], *, threshold: int = 6) -> list[Place]:
    """Проставляет is_chain / branch_count / chain_reason по всему набору."""
    counts: dict[str, int] = defaultdict(int)
    for place in places:
        norm = normalize_business_name(place.name)
        if norm:
            counts[norm] += 1

    for place in places:
        norm = normalize_business_name(place.name)
        place.branch_count = max(place.branch_count, counts.get(norm, 1))
        is_chain, reason = chain_verdict(place, name_counts=counts, threshold=threshold)
        if is_chain:
            place.is_chain = True
            place.chain_reason = reason
    return places
