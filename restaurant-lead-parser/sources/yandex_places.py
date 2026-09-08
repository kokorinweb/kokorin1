"""Источник: Яндекс «Поиск по организациям» (Search API for organizations).

Официальный API, требует ключ из кабинета разработчика Яндекса.
Ограничения тарифа и правила отображения данных — на стороне пользователя ключа,
см. README, раздел «Ограничения источников».
"""
from __future__ import annotations

from typing import Any

from config import CATEGORIES, Config
from sources.base import BaseSource, RawPlace, SourceUnavailable
from sources.categories import map_category
from utils.cities import City
from utils.http import HttpClient
from utils.logger import get_logger
from utils.normalization import normalize_url

log = get_logger(__name__)

ENDPOINT = "https://search-maps.yandex.ru/v1/"
MAX_RESULTS_PER_REQUEST = 50

#: поисковые слова по нашим категориям
_CATEGORY_QUERIES = {
    "restaurant": ["ресторан"],
    "cafe": ["кафе"],
    "gastropub": ["гастробар", "винный бар"],
    "bar": ["бар", "паб"],
    "coffee_shop": ["кофейня"],
    "pizzeria": ["пиццерия"],
    "sushi": ["суши-бар", "японский ресторан"],
    "family_restaurant": ["семейный ресторан"],
    "georgian": ["грузинский ресторан"],
    "italian": ["итальянский ресторан"],
    "asian": ["азиатский ресторан", "чайхана"],
    "steakhouse": ["стейк-хаус"],
    "bakery_cafe": ["пекарня кафе", "кондитерская"],
    "bistro": ["бистро"],
    "other_food": ["ресторан быстрого обслуживания"],
}


class YandexPlacesSource(BaseSource):
    name = "yandex"
    priority = 40

    def is_configured(self) -> bool:
        return bool(self.creds.yandex_places_key)

    def unavailable_reason(self) -> str:
        return "не задан YANDEX_PLACES_API_KEY"

    @staticmethod
    def _span(city: City) -> str:
        # приблизительный охват в градусах вокруг центра города
        delta_lat = min(0.6, max(0.05, city.search_radius_km / 111.0))
        delta_lon = min(1.2, delta_lat * 1.8)
        return f"{delta_lon:.4f},{delta_lat:.4f}"

    def _to_raw(self, feature: dict[str, Any], city: City) -> RawPlace | None:
        props = feature.get("properties") or {}
        meta = props.get("CompanyMetaData") or {}
        name = (meta.get("name") or props.get("name") or "").strip()
        if not name:
            return None

        coords = (feature.get("geometry") or {}).get("coordinates") or []
        lon, lat = (coords + [None, None])[:2]

        phones = [p.get("formatted", "") for p in meta.get("Phones", []) if p.get("formatted")]
        categories = [c.get("name", "") for c in meta.get("Categories", [])]
        hours = (meta.get("Hours") or {}).get("text", "")

        links = meta.get("Links") or []
        socials: list[str] = []
        booking = delivery = ""
        for link in links:
            href = normalize_url(link.get("href"))
            if not href:
                continue
            aref = (link.get("aref") or link.get("tag") or "").lower()
            if aref in ("booking", "reserve"):
                booking = booking or href
            elif aref in ("delivery", "order"):
                delivery = delivery or href
            else:
                socials.append(href)

        company_id = str(meta.get("id") or props.get("id") or "")
        return RawPlace(
            source=self.name,
            source_id=company_id,
            name=name,
            raw_category=", ".join(categories),
            city=city.name,
            region=city.region,
            address=meta.get("address", "") or props.get("description", ""),
            latitude=float(lat) if lat is not None else None,
            longitude=float(lon) if lon is not None else None,
            phones=phones,
            website=normalize_url(meta.get("url")) or "",
            social_urls=socials,
            booking_url=booking,
            delivery_url=delivery,
            working_hours=hours,
            rating=None,          # рейтинг не отдаётся Search API организаций
            reviews_count=None,
            source_url=f"https://yandex.ru/maps/org/{company_id}" if company_id else "",
            tags={"categories": categories},
        )

    async def fetch_city(self, city: City, categories: list[str], limit: int) -> list[RawPlace]:
        if not self.is_configured():
            raise SourceUnavailable(self.unavailable_reason())

        niche = self.config.niche
        if not niche.food:
            queries = list(niche.search_terms) or [niche.title]
        else:
            queries = []
            for key in categories or list(CATEGORIES):
                queries.extend(_CATEGORY_QUERIES.get(key, []))
            queries = list(dict.fromkeys(queries)) or ["ресторан", "кафе"]

        seen: set[str] = set()
        collected: list[RawPlace] = []
        span = self._span(city)

        for query in queries:
            skip = 0
            while True:
                params = {
                    "apikey": self.creds.yandex_places_key,
                    "text": f"{query} {city.name}",
                    "lang": "ru_RU",
                    "type": "biz",
                    "results": MAX_RESULTS_PER_REQUEST,
                    "ll": f"{city.lon},{city.lat}",
                    "spn": span,
                    "skip": skip,
                }
                payload = await self.http.get_json(ENDPOINT, service="yandex", params=params)
                features = payload.get("features") or []
                if not features:
                    break

                new_in_batch = 0
                for feature in features:
                    raw = self._to_raw(feature, city)
                    if raw is None or raw.source_id in seen:
                        continue
                    seen.add(raw.source_id)
                    new_in_batch += 1
                    if niche.food and categories:
                        if map_category(raw.name, raw.raw_category) not in categories:
                            continue
                    collected.append(raw)

                if new_in_batch == 0 or len(features) < MAX_RESULTS_PER_REQUEST:
                    break
                skip += MAX_RESULTS_PER_REQUEST
                if skip >= 500:  # предел выдачи API
                    break
                if limit and len(collected) >= limit:
                    return collected[:limit]
            if limit and len(collected) >= limit:
                break
        return collected[:limit] if limit else collected
