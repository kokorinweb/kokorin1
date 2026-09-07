"""Справочник городов России: выбор области обхода."""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from config import CITIES_FILE


@dataclass(frozen=True)
class City:
    name: str
    region: str
    federal_district: str
    population: int
    lat: float
    lon: float
    search_radius_km: float

    @property
    def label(self) -> str:
        return f"{self.name} ({self.region})"


def _norm(text: str) -> str:
    text = (text or "").lower().replace("ё", "е")
    text = re.sub(r"[^0-9a-zа-я]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


@lru_cache(maxsize=1)
def load_cities(path: str | Path | None = None) -> tuple[City, ...]:
    file_path = Path(path) if path else CITIES_FILE
    with open(file_path, encoding="utf-8") as fh:
        doc = json.load(fh)
    return tuple(City(**item) for item in doc["cities"])


def all_cities() -> list[City]:
    return list(load_cities())


def find_city(name: str) -> City | None:
    target = _norm(name)
    for city in load_cities():
        if _norm(city.name) == target:
            return city
    for city in load_cities():
        if target and target in _norm(city.name):
            return city
    return None


def cities_in_region(region: str) -> list[City]:
    target = _norm(region)
    exact = [c for c in load_cities() if _norm(c.region) == target]
    if exact:
        return exact
    return [c for c in load_cities() if target and target in _norm(c.region)]


def cities_in_district(district: str) -> list[City]:
    target = _norm(district)
    return [c for c in load_cities() if target in _norm(c.federal_district)]


def known_regions() -> list[str]:
    return sorted({c.region for c in load_cities()})


def resolve_scope(
    *, cities: list[str] | None = None, region: str = "", country: str = ""
) -> list[City]:
    """Раскрывает область обхода в упорядоченный список городов (крупные первыми)."""
    if country:
        if country.upper() not in ("RU", "RUS", "RUSSIA", "РФ", "РОССИЯ"):
            raise ValueError(f"Поддерживается только страна RU, получено: {country}")
        return sorted(load_cities(), key=lambda c: -c.population)
    if region:
        found = cities_in_region(region) or cities_in_district(region)
        if not found:
            raise ValueError(
                f"Регион не найден: {region}. Доступные: {', '.join(known_regions()[:12])}…"
            )
        return sorted(found, key=lambda c: -c.population)

    resolved: list[City] = []
    missing: list[str] = []
    for raw in cities or []:
        city = find_city(raw)
        if city:
            resolved.append(city)
        else:
            missing.append(raw)
    if missing:
        raise ValueError(
            f"Города не найдены в справочнике: {', '.join(missing)}. "
            "Добавь их в data/russian_cities.json (name, region, lat, lon, population)."
        )
    return resolved
