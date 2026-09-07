"""Дедупликация: одно заведение из нескольких источников -> одна запись.

Объединяем по названию (fuzzy), адресу, телефону, координатам и домену.
НЕ объединяем разные филиалы одной сети: если адреса/координаты расходятся —
это разные точки, даже при полностью совпадающем названии.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field

from rapidfuzz import fuzz

from database.models import Place
from utils.geo import distance_m, neighbour_cells
from utils.logger import get_logger
from utils.normalization import (
    address_house_number, normalize_address, normalize_business_name, normalize_domain,
)

log = get_logger(__name__)

#: до этого расстояния считаем, что это одна и та же точка
SAME_POINT_M = 120.0
#: дальше этого — гарантированно разные филиалы, что бы ни говорило название
DIFFERENT_BRANCH_M = 350.0
#: порог похожести названий
NAME_MATCH_THRESHOLD = 88.0
#: смягчённый порог, когда совпал телефон или адрес
NAME_MATCH_SOFT = 70.0


@dataclass
class MergeDecision:
    same: bool
    reason: str
    score: float = 0.0


def place_key(place: Place) -> str:
    """Стабильный ключ записи: имя + город + дом/координаты."""
    parts = [
        normalize_business_name(place.name),
        (place.city or "").lower(),
        address_house_number(place.full_address) or "",
    ]
    if place.latitude is not None and place.longitude is not None:
        parts.append(f"{place.latitude:.4f},{place.longitude:.4f}")
    raw = "|".join(parts)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:20]


def is_same_place(a: Place, b: Place) -> MergeDecision:
    """Решает, одно ли это заведение."""
    if a.city and b.city and a.city.lower() != b.city.lower():
        return MergeDecision(False, "разные города")

    dist = distance_m(a.coords, b.coords)
    name_score = fuzz.token_set_ratio(
        normalize_business_name(a.name), normalize_business_name(b.name)
    )

    domains_a = {normalize_domain(d) for d in [*a.detected_domains, a.website_from_source] if d}
    domains_b = {normalize_domain(d) for d in [*b.detected_domains, b.website_from_source] if d}
    shared_domain = bool(domains_a & domains_b - {None})

    phones_a, phones_b = set(a.phones), set(b.phones)
    shared_phone = bool(phones_a & phones_b)

    house_a = address_house_number(a.full_address)
    house_b = address_house_number(b.full_address)
    addr_a, addr_b = normalize_address(a.full_address), normalize_address(b.full_address)
    addr_score = fuzz.token_set_ratio(addr_a, addr_b) if addr_a and addr_b else 0.0

    # --- жёсткие признаки РАЗНЫХ филиалов ---
    if dist is not None and dist > DIFFERENT_BRANCH_M:
        return MergeDecision(False, f"точки в {dist:.0f} м друг от друга — разные филиалы", name_score)
    if house_a and house_b and house_a != house_b and (dist is None or dist > SAME_POINT_M):
        return MergeDecision(False, f"разные дома ({house_a} / {house_b}) — разные филиалы", name_score)

    # --- признаки ОДНОГО заведения ---
    if shared_domain and name_score >= NAME_MATCH_SOFT:
        return MergeDecision(True, "совпал собственный домен и похоже название", name_score)
    if shared_phone and name_score >= NAME_MATCH_SOFT:
        return MergeDecision(True, "совпал телефон и похоже название", name_score)
    if name_score >= NAME_MATCH_THRESHOLD:
        if dist is not None and dist <= SAME_POINT_M:
            return MergeDecision(True, f"одно название, расстояние {dist:.0f} м", name_score)
        if addr_score >= 90 and (house_a == house_b or not (house_a and house_b)):
            return MergeDecision(True, "одно название и совпадающий адрес", name_score)
        if dist is None and addr_score >= 80:
            return MergeDecision(True, "одно название, координат нет, адреса похожи", name_score)
    if shared_phone and dist is not None and dist <= SAME_POINT_M:
        return MergeDecision(True, "совпал телефон и координаты", name_score)

    return MergeDecision(False, "недостаточно совпадений", name_score)


def _pick(primary: str | None, secondary: str | None) -> str:
    """Берём непустое, при равенстве — более длинное (обычно полнее)."""
    primary = primary or ""
    secondary = secondary or ""
    if not primary:
        return secondary
    if not secondary:
        return primary
    return primary if len(primary) >= len(secondary) else secondary


def merge_places(base: Place, other: Place, *, priorities: dict[str, int] | None = None) -> Place:
    """Сливает две записи. Поля берутся из источника с большим приоритетом."""
    priorities = priorities or {}
    if priorities.get(other.source, 0) > priorities.get(base.source, 0):
        base, other = other, base

    base.name = base.name or other.name
    base.category = base.category or other.category
    base.raw_category = _pick(base.raw_category, other.raw_category)
    base.city = base.city or other.city
    base.region = base.region or other.region
    base.full_address = _pick(base.full_address, other.full_address)
    base.normalized_address = normalize_address(base.full_address)
    base.working_hours = _pick(base.working_hours, other.working_hours)
    base.email = base.email or other.email
    base.source_url = base.source_url or other.source_url

    if base.latitude is None and other.latitude is not None:
        base.latitude, base.longitude = other.latitude, other.longitude

    phones = list(dict.fromkeys([*base.phones, *other.phones]))
    base.phone = "; ".join(phones)

    if other.rating is not None and (base.rating is None or (other.reviews_count or 0) > (base.reviews_count or 0)):
        base.rating = other.rating
    if other.reviews_count is not None:
        base.reviews_count = max(base.reviews_count or 0, other.reviews_count)
    if base.price_level is None:
        base.price_level = other.price_level

    base.website_from_source = base.website_from_source or other.website_from_source
    base.vk_url = base.vk_url or other.vk_url
    base.telegram_url = base.telegram_url or other.telegram_url
    base.instagram_url = base.instagram_url or other.instagram_url
    base.booking_url = base.booking_url or other.booking_url
    base.delivery_url = base.delivery_url or other.delivery_url
    base.other_socials = list(dict.fromkeys([*base.other_socials, *other.other_socials]))
    base.detected_domains = list(dict.fromkeys([*base.detected_domains, *other.detected_domains]))

    base.sources = list(dict.fromkeys([*base.sources, *other.sources, base.source, other.source]))
    base.source_ids = list(dict.fromkeys([*base.source_ids, *other.source_ids]))

    base.is_chain = base.is_chain or other.is_chain
    base.chain_reason = base.chain_reason or other.chain_reason
    base.branch_count = max(base.branch_count, other.branch_count)
    base.place_key = place_key(base)
    return base


def deduplicate(
    places: list[Place], *, priorities: dict[str, int] | None = None
) -> tuple[list[Place], int]:
    """Схлопывает дубли. Возвращает (уникальные записи, сколько слито)."""
    buckets: dict[str, list[int]] = {}
    result: list[Place] = []
    merged = 0

    for place in places:
        candidate_indexes: set[int] = set()
        keys = _bucket_keys(place)
        for key in keys:
            candidate_indexes.update(buckets.get(key, ()))

        target: int | None = None
        for index in sorted(candidate_indexes):
            decision = is_same_place(result[index], place)
            if decision.same:
                target = index
                log.debug(
                    "слияние «%s» + «%s»: %s", result[index].name, place.name, decision.reason
                )
                break

        if target is None:
            result.append(place)
            index = len(result) - 1
            for key in keys:
                buckets.setdefault(key, []).append(index)
        else:
            result[target] = merge_places(result[target], place, priorities=priorities)
            merged += 1
            for key in _bucket_keys(result[target]):
                bucket = buckets.setdefault(key, [])
                if target not in bucket:
                    bucket.append(target)

    return result, merged


def _bucket_keys(place: Place) -> list[str]:
    """Ключи блокировки: по геоячейкам, по префиксу имени, по телефону, по домену."""
    keys: list[str] = []
    norm_name = normalize_business_name(place.name)
    city = (place.city or "").lower()
    if norm_name:
        keys.append(f"n:{city}:{norm_name[:6]}")
    for cell in neighbour_cells(place.latitude, place.longitude):
        keys.append(f"g:{cell}")
    for phone in place.phones:
        keys.append(f"p:{phone}")
    for domain in place.detected_domains:
        normalized = normalize_domain(domain)
        if normalized:
            keys.append(f"d:{normalized}")
    return keys or [f"x:{place.source}:{place.source_ids}"]
