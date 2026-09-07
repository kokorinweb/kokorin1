"""Источник: 2ГИС Catalog API (dev.2gis.ru). Требует ключ."""
from __future__ import annotations

from typing import Any

from sources.base import BaseSource, RawPlace, SourceUnavailable
from sources.categories import map_category
from utils.cities import City
from utils.logger import get_logger
from utils.normalization import normalize_url

log = get_logger(__name__)

ENDPOINT = "https://catalog.api.2gis.com/3.0/items"
PAGE_SIZE = 50
MAX_PAGES = 10                       # API отдаёт максимум ~500 объектов на запрос
MAX_RADIUS_M = 40_000

FIELDS = ",".join([
    "items.point", "items.address", "items.contact_groups", "items.rubrics",
    "items.schedule", "items.reviews", "items.external_content", "items.name_ex",
    "items.org", "items.region_id",
])

_CATEGORY_QUERIES = {
    "restaurant": ["ресторан"],
    "cafe": ["кафе"],
    "gastropub": ["гастробар"],
    "bar": ["бар"],
    "coffee_shop": ["кофейня"],
    "pizzeria": ["пиццерия"],
    "sushi": ["суши"],
    "family_restaurant": ["семейный ресторан"],
    "georgian": ["грузинская кухня"],
    "italian": ["итальянская кухня"],
    "asian": ["азиатская кухня"],
    "steakhouse": ["стейк-хаус"],
    "bakery_cafe": ["пекарня"],
    "bistro": ["бистро"],
    "other_food": ["общественное питание"],
}

_CONTACT_SOCIAL_TYPES = {
    "vkontakte": "vk", "vk": "vk", "telegram": "telegram", "instagram": "instagram",
    "facebook": "facebook", "odnoklassniki": "ok", "youtube": "youtube",
    "twitter": "twitter", "tiktok": "tiktok", "whatsapp": "whatsapp",
}


class DGisSource(BaseSource):
    name = "dgis"
    priority = 35

    def is_configured(self) -> bool:
        return bool(self.creds.dgis_key)

    def unavailable_reason(self) -> str:
        return "не задан DGIS_API_KEY"

    def _to_raw(self, item: dict[str, Any], city: City) -> RawPlace | None:
        name = (item.get("name") or (item.get("name_ex") or {}).get("primary") or "").strip()
        if not name:
            return None

        point = item.get("point") or {}
        rubrics = [r.get("name", "") for r in item.get("rubrics", [])]

        phones: list[str] = []
        email = website = booking = delivery = ""
        socials: list[str] = []
        for group in item.get("contact_groups", []):
            for contact in group.get("contacts", []):
                ctype = (contact.get("type") or "").lower()
                value = contact.get("value") or contact.get("url") or contact.get("text") or ""
                if not value:
                    continue
                if ctype == "phone":
                    phones.append(value)
                elif ctype == "email":
                    email = email or value
                elif ctype == "website":
                    website = website or (normalize_url(value) or "")
                elif ctype in ("booking", "reserve"):
                    booking = booking or (normalize_url(value) or "")
                elif ctype in ("delivery", "order"):
                    delivery = delivery or (normalize_url(value) or "")
                elif ctype in _CONTACT_SOCIAL_TYPES:
                    url = normalize_url(value)
                    if url:
                        socials.append(url)

        reviews = item.get("reviews") or {}
        schedule = item.get("schedule") or {}
        hours = schedule.get("comment", "") or (
            "; ".join(
                f"{day}: " + ", ".join(f"{w.get('from')}-{w.get('to')}" for w in payload.get("working_hours", []))
                for day, payload in schedule.items()
                if isinstance(payload, dict) and payload.get("working_hours")
            )
        )

        item_id = str(item.get("id", ""))
        return RawPlace(
            source=self.name,
            source_id=item_id,
            name=name,
            raw_category=", ".join(rubrics),
            city=city.name,
            region=city.region,
            address=item.get("address_name") or item.get("full_address_name") or "",
            latitude=float(point["lat"]) if point.get("lat") is not None else None,
            longitude=float(point["lon"]) if point.get("lon") is not None else None,
            phones=phones,
            email=email,
            website=website,
            social_urls=socials,
            booking_url=booking,
            delivery_url=delivery,
            working_hours=hours,
            rating=float(reviews["general_rating"]) if reviews.get("general_rating") else None,
            reviews_count=int(reviews["general_review_count"]) if reviews.get("general_review_count") else None,
            source_url=f"https://2gis.ru/firm/{item_id}" if item_id else "",
            brand=(item.get("org") or {}).get("name", ""),
            brand_id=str((item.get("org") or {}).get("id", "")),
            tags={"rubrics": rubrics, "branch_count": (item.get("org") or {}).get("branch_count")},
        )

    async def fetch_city(self, city: City, categories: list[str], limit: int) -> list[RawPlace]:
        if not self.is_configured():
            raise SourceUnavailable(self.unavailable_reason())

        queries: list[str] = []
        for key in categories:
            queries.extend(_CATEGORY_QUERIES.get(key, []))
        queries = list(dict.fromkeys(queries)) or ["кафе", "ресторан"]

        radius = int(min(MAX_RADIUS_M, city.search_radius_km * 1000))
        seen: set[str] = set()
        collected: list[RawPlace] = []

        for query in queries:
            for page in range(1, MAX_PAGES + 1):
                params = {
                    "q": query,
                    "point": f"{city.lon},{city.lat}",
                    "radius": radius,
                    "type": "branch",
                    "page": page,
                    "page_size": PAGE_SIZE,
                    "fields": FIELDS,
                    "locale": "ru_RU",
                    "key": self.creds.dgis_key,
                }
                payload = await self.http.get_json(ENDPOINT, service="dgis", params=params)
                meta = payload.get("meta") or {}
                if meta.get("code") and int(meta["code"]) >= 400:
                    log.warning("[%s] 2ГИС: %s", city.name, meta.get("error", {}).get("message"))
                    return collected
                items = (payload.get("result") or {}).get("items") or []
                if not items:
                    break

                for item in items:
                    raw = self._to_raw(item, city)
                    if raw is None or raw.source_id in seen:
                        continue
                    seen.add(raw.source_id)
                    category = map_category(raw.name, raw.raw_category)
                    if categories and category not in categories:
                        continue
                    collected.append(raw)

                if len(items) < PAGE_SIZE:
                    break
                if limit and len(collected) >= limit:
                    return collected[:limit]
        return collected[:limit] if limit else collected
