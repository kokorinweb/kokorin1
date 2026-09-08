"""Источник: OpenStreetMap через Overpass API.

Легально и без ключей: ODbL-данные, публичный read-only API.
Соблюдаем правила использования — 1 запрос за раз, паузы, честный User-Agent.
"""
from __future__ import annotations

from typing import Any

from config import Config
from sources.base import BaseSource, RawPlace
from sources.categories import map_category
from utils.cities import City
from utils.geo import bbox_around
from utils.http import HttpClient
from utils.logger import get_logger
from utils.normalization import normalize_url

log = get_logger(__name__)

#: какие amenity вытаскиваем — только полноценный общепит
_AMENITIES = ("restaurant", "cafe", "bar", "pub", "biergarten", "food_court", "fast_food")

#: cuisine-теги, при которых fast_food всё-таки интересен (пиццерии, суши и т.п.)
_FASTFOOD_OK_CUISINES = (
    "pizza", "sushi", "japanese", "georgian", "italian", "asian", "chinese",
    "thai", "korean", "vietnamese", "uzbek", "steak_house", "coffee_shop", "burger",
)

_SOCIAL_TAG_KEYS = (
    "contact:vk", "contact:vkontakte", "vk", "contact:telegram", "telegram",
    "contact:instagram", "instagram", "contact:facebook", "facebook",
    "contact:odnoklassniki", "contact:youtube", "contact:tiktok", "contact:whatsapp",
)

_WEBSITE_TAG_KEYS = ("website", "contact:website", "url", "website:menu", "contact:url")


class OverpassSource(BaseSource):
    """Заведения из OSM по административной границе города (или bbox как fallback)."""

    name = "osm"
    priority = 20

    def __init__(self, config: Config, http: HttpClient) -> None:
        super().__init__(config, http)
        self.endpoint = self.creds.overpass_url
        self.nominatim = self.creds.nominatim_url.rstrip("/")

    def is_configured(self) -> bool:
        return bool(self.endpoint)

    # -- поиск административной области города ------------------------------

    async def _area_id(self, city: City) -> int | None:
        """OSM area id города через Nominatim (relation -> 3600000000 + id)."""
        cache_key = f"{city.name}|{city.region}"
        cached = getattr(self, "_area_cache", None)
        if cached is None:
            cached = self._area_cache = {}
        if cache_key in cached:
            return cached[cache_key]

        params = {
            "q": f"{city.name}, {city.region}, Россия",
            "format": "jsonv2",
            "limit": 5,
            "addressdetails": 0,
            "accept-language": "ru",
        }
        try:
            data = await self.http.get_json(
                f"{self.nominatim}/search",
                service="nominatim",
                params=params,
                headers={"User-Agent": self.creds.osm_user_agent},
            )
        except Exception as exc:  # noqa: BLE001 — fallback на bbox всегда возможен
            log.warning("[%s] Nominatim недоступен (%s), беру bbox вокруг центра", city.name, exc)
            cached[cache_key] = None
            return None

        for item in data or []:
            if item.get("osm_type") == "relation" and item.get("class") in ("boundary", "place"):
                area_id = 3_600_000_000 + int(item["osm_id"])
                cached[cache_key] = area_id
                return area_id
        cached[cache_key] = None
        return None

    # -- построение запроса -------------------------------------------------

    @staticmethod
    def _build_query(
        *,
        area_id: int | None,
        bbox: tuple[float, float, float, float] | None,
        filters: tuple[str, ...] = (),
    ) -> str:
        """Собирает Overpass QL из селекторов ниши."""
        if area_id:
            scope_decl = f"area({area_id})->.a;"
            scope = "(area.a)"
        else:
            assert bbox is not None
            scope_decl = ""
            scope = "({:.5f},{:.5f},{:.5f},{:.5f})".format(*bbox)

        if not filters:
            amenity_re = "|".join(_AMENITIES)
            filters = (
                f'["amenity"~"^({amenity_re})$"]',
                '["cuisine"]["amenity"]',
            )
        body = "".join(f'nwr{selector}["name"]{scope};' for selector in filters)
        return (
            "[out:json][timeout:180];"
            f"{scope_decl}"
            f"({body});"
            "out center tags 20000;"
        )

    # -- разбор элемента ----------------------------------------------------

    @staticmethod
    def _element_coords(element: dict[str, Any]) -> tuple[float | None, float | None]:
        if "lat" in element and "lon" in element:
            return float(element["lat"]), float(element["lon"])
        center = element.get("center") or {}
        if "lat" in center and "lon" in center:
            return float(center["lat"]), float(center["lon"])
        return None, None

    @staticmethod
    def _address(tags: dict[str, str], city: City) -> str:
        parts = []
        street = tags.get("addr:street") or tags.get("addr:place")
        house = tags.get("addr:housenumber")
        city_name = tags.get("addr:city") or city.name
        if city_name:
            parts.append(city_name)
        if street:
            parts.append(street)
        if house:
            parts.append(f"д. {house}")
        if not street and tags.get("address"):
            parts.append(tags["address"])
        return ", ".join(parts)

    def _to_raw(self, element: dict[str, Any], city: City, food: bool = True) -> RawPlace | None:
        tags = {k: str(v) for k, v in (element.get("tags") or {}).items()}
        name = (tags.get("name:ru") or tags.get("name") or tags.get("official_name") or "").strip()
        if not name:
            return None

        amenity = tags.get("amenity", "")
        cuisine = tags.get("cuisine", "")
        if food:
            if amenity == "fast_food" and not any(c in cuisine for c in _FASTFOOD_OK_CUISINES):
                # обычный фастфуд/шаурма без кухни — не наш лид
                return None
            if amenity not in _AMENITIES and not cuisine:
                return None

        lat, lon = self._element_coords(element)
        website = ""
        for key in _WEBSITE_TAG_KEYS:
            candidate = normalize_url(tags.get(key))
            if candidate:
                website = candidate
                break

        socials: list[str] = []
        for key in _SOCIAL_TAG_KEYS:
            raw = tags.get(key)
            if not raw:
                continue
            for chunk in str(raw).split(";"):
                chunk = chunk.strip()
                if not chunk:
                    continue
                if not chunk.startswith("http"):
                    if key.endswith(("vk", "vkontakte")):
                        chunk = f"https://vk.com/{chunk.lstrip('@/')}"
                    elif key.endswith("telegram"):
                        chunk = f"https://t.me/{chunk.lstrip('@/')}"
                    elif key.endswith("instagram"):
                        chunk = f"https://instagram.com/{chunk.lstrip('@/')}"
                    else:
                        continue
                url = normalize_url(chunk)
                if url:
                    socials.append(url)

        phones = []
        for key in ("phone", "contact:phone", "contact:mobile", "phone:mobile"):
            if tags.get(key):
                phones.append(tags[key])

        element_type = element.get("type", "node")
        element_id = element.get("id")
        return RawPlace(
            source=self.name,
            source_id=f"{element_type}/{element_id}",
            name=name,
            raw_category=" ".join(filter(None, (
                amenity, cuisine, tags.get("shop", ""), tags.get("office", ""),
                tags.get("craft", ""), tags.get("healthcare", ""), tags.get("leisure", ""),
                tags.get("tourism", ""), tags.get("brand", ""),
            ))),
            city=tags.get("addr:city") or city.name,
            region=city.region,
            address=self._address(tags, city),
            latitude=lat,
            longitude=lon,
            phones=phones,
            email=tags.get("email") or tags.get("contact:email", ""),
            website=website,
            social_urls=socials,
            booking_url=normalize_url(tags.get("contact:booking") or tags.get("reservation:url")) or "",
            delivery_url=normalize_url(tags.get("contact:delivery") or tags.get("delivery:url")) or "",
            working_hours=tags.get("opening_hours", ""),
            rating=None,
            reviews_count=None,
            price_level=None,
            source_url=f"https://www.openstreetmap.org/{element_type}/{element_id}",
            brand=tags.get("brand", "") or tags.get("operator", ""),
            brand_id=tags.get("brand:wikidata", ""),
            tags=tags,
        )

    # -- основной метод -----------------------------------------------------

    async def fetch_city(self, city: City, categories: list[str], limit: int) -> list[RawPlace]:
        niche = self.config.niche
        area_id = await self._area_id(city)
        bbox = None if area_id else bbox_around(city.lat, city.lon, city.search_radius_km)
        query = self._build_query(area_id=area_id, bbox=bbox, filters=niche.osm_filters)

        response = await self.http.post(
            self.endpoint,
            service="overpass",
            data={"data": query},
            headers={"User-Agent": self.creds.osm_user_agent},
        )
        try:
            payload = response.json()
        except ValueError:
            log.error("[%s] Overpass вернул не-JSON (%d байт)", city.name, len(response.content))
            return []

        elements = payload.get("elements", [])
        log.debug("[%s] Overpass: %d сырых элементов", city.name, len(elements))

        places: list[RawPlace] = []
        for element in elements:
            raw = self._to_raw(element, city, food=niche.food)
            if raw is None:
                continue
            if niche.food and categories:
                if map_category(raw.name, raw.raw_category) not in categories:
                    continue
            places.append(raw)
            if limit and len(places) >= limit:
                break
        return places
