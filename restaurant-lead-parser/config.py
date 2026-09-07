"""Конфигурация: категории, лимиты, ключи API, пороги.

Значения берутся из .env (python-dotenv), затем переопределяются аргументами CLI.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field, replace
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
CITIES_FILE = BASE_DIR / "data" / "russian_cities.json"

load_dotenv(BASE_DIR / ".env")


# ---------------------------------------------------------------------------
# Категории заведений
# ---------------------------------------------------------------------------

#: ключ -> (человекочитаемое имя, включена ли по умолчанию)
CATEGORIES: dict[str, tuple[str, bool]] = {
    "restaurant":        ("Ресторан", True),
    "cafe":              ("Кафе", True),
    "gastropub":         ("Гастробар", True),
    "bar":               ("Бар с кухней", True),
    "coffee_shop":       ("Кофейня", True),
    "pizzeria":          ("Пиццерия", True),
    "sushi":             ("Суши-ресторан", True),
    "family_restaurant": ("Семейный ресторан", True),
    "georgian":          ("Грузинский ресторан", True),
    "italian":           ("Итальянский ресторан", True),
    "asian":             ("Азиатский ресторан", True),
    "steakhouse":        ("Стейк-хаус", True),
    "bakery_cafe":       ("Пекарня-кафе", True),
    "bistro":            ("Бистро / столовая формата кафе", False),
    "other_food":        ("Прочий общепит", True),
}

DEFAULT_CATEGORIES = [key for key, (_, on) in CATEGORIES.items() if on]


def parse_categories(raw: str | None) -> list[str]:
    """`--categories restaurant,cafe` -> список ключей. `all` -> все."""
    if not raw:
        return list(DEFAULT_CATEGORIES)
    raw = raw.strip()
    if raw.lower() in ("all", "*", "все"):
        return list(CATEGORIES)
    wanted, unknown = [], []
    for item in raw.split(","):
        key = item.strip().lower().replace("-", "_").replace(" ", "_")
        if key in CATEGORIES:
            wanted.append(key)
        elif key:
            unknown.append(item.strip())
    if unknown:
        raise ValueError(
            f"Неизвестные категории: {', '.join(unknown)}. "
            f"Доступные: {', '.join(CATEGORIES)}"
        )
    return wanted or list(DEFAULT_CATEGORIES)


# ---------------------------------------------------------------------------
# Ключи и эндпоинты
# ---------------------------------------------------------------------------


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def _env_float(name: str, default: float) -> float:
    try:
        return float(_env(name) or default)
    except ValueError:
        return default


@dataclass
class Credentials:
    overpass_url: str = field(default_factory=lambda: _env("OVERPASS_URL", "https://overpass-api.de/api/interpreter"))
    nominatim_url: str = field(default_factory=lambda: _env("NOMINATIM_URL", "https://nominatim.openstreetmap.org"))
    osm_user_agent: str = field(default_factory=lambda: _env("OSM_USER_AGENT", "restaurant-lead-parser/1.0 (contact: set OSM_USER_AGENT)"))

    yandex_places_key: str = field(default_factory=lambda: _env("YANDEX_PLACES_API_KEY"))
    dgis_key: str = field(default_factory=lambda: _env("DGIS_API_KEY"))

    brave_key: str = field(default_factory=lambda: _env("BRAVE_API_KEY"))
    google_cse_key: str = field(default_factory=lambda: _env("GOOGLE_CSE_API_KEY"))
    google_cse_cx: str = field(default_factory=lambda: _env("GOOGLE_CSE_CX"))
    serpapi_key: str = field(default_factory=lambda: _env("SERPAPI_KEY"))
    search_providers: str = field(default_factory=lambda: _env("SEARCH_PROVIDERS", "brave,google_cse,serpapi"))

    vk_token: str = field(default_factory=lambda: _env("VK_SERVICE_TOKEN"))
    vk_api_version: str = field(default_factory=lambda: _env("VK_API_VERSION", "5.199"))

    def has_search_provider(self) -> bool:
        return bool(self.brave_key or (self.google_cse_key and self.google_cse_cx) or self.serpapi_key)

    def enabled_search_providers(self) -> list[str]:
        order = [p.strip() for p in self.search_providers.split(",") if p.strip()]
        available = []
        for name in order:
            if name == "brave" and self.brave_key:
                available.append(name)
            elif name == "google_cse" and self.google_cse_key and self.google_cse_cx:
                available.append(name)
            elif name == "serpapi" and self.serpapi_key:
                available.append(name)
        return available


# ---------------------------------------------------------------------------
# Основная конфигурация запуска
# ---------------------------------------------------------------------------


@dataclass
class Config:
    # --- область обхода ---
    cities: list[str] = field(default_factory=list)
    region: str = ""
    country: str = ""                     # "RU" -> вся страна
    categories: list[str] = field(default_factory=lambda: list(DEFAULT_CATEGORIES))
    limit: int = 500                      # максимум заведений на прогон
    per_city_limit: int = 0               # 0 = без отдельного лимита на город

    # --- фильтры лида ---
    min_rating: float = 0.0
    min_reviews: int = 0
    min_confidence: int = 85
    min_lead_score: int = 0
    exclude_chains: bool = False
    chain_branch_threshold: int = 6       # столько+ одноимённых точек = сеть

    # --- источники ---
    sources: list[str] = field(default_factory=lambda: ["osm", "yandex", "dgis"])

    # --- проверки ---
    check_websites: bool = True
    use_search: bool = True
    use_socials: bool = True
    use_domain_probe: bool = True
    domain_probe_max_candidates: int = 8
    search_queries_per_place: int = 2
    search_results_per_query: int = 8

    # --- инфраструктура ---
    db_path: str = field(default_factory=lambda: _env("DB_PATH", "data/leads.sqlite3"))
    output: str = "output/restaurants_no_website.xlsx"
    output_dir: str = "output"
    log_level: str = field(default_factory=lambda: _env("LOG_LEVEL", "INFO"))
    http_timeout: float = field(default_factory=lambda: _env_float("HTTP_TIMEOUT", 20.0))
    resume: bool = False
    refresh: bool = False                 # игнорировать кэш проверок
    dry_run: bool = False
    progress_bar: bool = True

    # --- TTL кэша, секунды ---
    ttl_search: float = 14 * 24 * 3600
    ttl_domain: float = 30 * 24 * 3600
    ttl_social: float = 14 * 24 * 3600
    ttl_harvest: float = 21 * 24 * 3600
    recheck_after_days: int = 45          # не перепроверять заведение чаще

    credentials: Credentials = field(default_factory=Credentials)

    # -- производное --------------------------------------------------------

    @property
    def scope_label(self) -> str:
        if self.country:
            return f"country:{self.country}"
        if self.region:
            return f"region:{self.region}"
        return "cities:" + ",".join(self.cities)

    def search_enabled(self) -> bool:
        return self.use_search and self.credentials.has_search_provider()

    def socials_enabled(self) -> bool:
        return self.use_socials

    def with_overrides(self, **kwargs: object) -> "Config":
        return replace(self, **{k: v for k, v in kwargs.items() if v is not None})


# ---------------------------------------------------------------------------
# Политики доступа к внешним сервисам (concurrency / пауза / повторы)
# ---------------------------------------------------------------------------

RATE_LIMITS: dict[str, dict[str, float | int]] = {
    # Публичный Overpass — общий ресурс, ведём себя вежливо.
    "overpass":   {"concurrency": 1, "min_interval": 3.0, "attempts": 4, "base_delay": 5.0, "timeout": 300.0},
    "nominatim":  {"concurrency": 1, "min_interval": 1.1, "attempts": 3, "base_delay": 2.0, "timeout": 30.0},
    "yandex":     {"concurrency": 3, "min_interval": 0.2, "attempts": 3, "base_delay": 1.0, "timeout": 25.0},
    "dgis":       {"concurrency": 3, "min_interval": 0.2, "attempts": 3, "base_delay": 1.0, "timeout": 25.0},
    "brave":      {"concurrency": 1, "min_interval": 1.05, "attempts": 3, "base_delay": 2.0, "timeout": 25.0},
    "google_cse": {"concurrency": 2, "min_interval": 0.3, "attempts": 3, "base_delay": 2.0, "timeout": 25.0},
    "serpapi":    {"concurrency": 2, "min_interval": 0.3, "attempts": 3, "base_delay": 2.0, "timeout": 30.0},
    "vk":         {"concurrency": 1, "min_interval": 0.35, "attempts": 3, "base_delay": 1.5, "timeout": 20.0},
    "telegram":   {"concurrency": 4, "min_interval": 0.2, "attempts": 2, "base_delay": 1.0, "timeout": 15.0},
    # Проверка чужих сайтов: много хостов, но по одному запросу на хост.
    "website":    {"concurrency": 16, "min_interval": 0.0, "attempts": 2, "base_delay": 1.0, "timeout": 15.0},
}
