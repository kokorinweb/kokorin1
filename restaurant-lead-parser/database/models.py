"""Модель заведения и SQL-схема локальной базы."""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any

# --- Статусы проверки сайта -------------------------------------------------

HAS_WEBSITE = "HAS_WEBSITE"
NO_WEBSITE_HIGH_CONFIDENCE = "NO_WEBSITE_HIGH_CONFIDENCE"
NO_WEBSITE_MEDIUM_CONFIDENCE = "NO_WEBSITE_MEDIUM_CONFIDENCE"
UNCERTAIN = "UNCERTAIN"
CHECK_FAILED = "CHECK_FAILED"
NOT_CHECKED = "NOT_CHECKED"

WEBSITE_STATUSES = (
    HAS_WEBSITE,
    NO_WEBSITE_HIGH_CONFIDENCE,
    NO_WEBSITE_MEDIUM_CONFIDENCE,
    UNCERTAIN,
    CHECK_FAILED,
    NOT_CHECKED,
)


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


@dataclass
class Place:
    """Одно заведение общепита (после нормализации, до/после проверок)."""

    # идентификация
    place_key: str = ""                     # стабильный ключ дедуплицированной записи
    name: str = ""
    normalized_name: str = ""
    category: str = ""
    raw_category: str = ""

    # география
    city: str = ""
    region: str = ""
    full_address: str = ""
    normalized_address: str = ""
    latitude: float | None = None
    longitude: float | None = None

    # контакты
    phone: str = ""                         # каноничные номера через "; "
    email: str = ""
    working_hours: str = ""

    # качество карточки
    rating: float | None = None
    reviews_count: int | None = None
    price_level: int | None = None

    # происхождение
    source: str = ""                        # основной источник
    sources: list[str] = field(default_factory=list)
    source_url: str = ""
    source_ids: list[str] = field(default_factory=list)

    # веб-присутствие
    website_from_source: str = ""
    vk_url: str = ""
    telegram_url: str = ""
    instagram_url: str = ""
    other_socials: list[str] = field(default_factory=list)
    booking_url: str = ""
    delivery_url: str = ""
    detected_domains: list[str] = field(default_factory=list)

    # результат проверки
    website_status: str = NOT_CHECKED
    website_confidence: int = 0
    website_check_reason: str = ""
    official_website: str = ""
    last_checked_at: str = ""

    # оценки
    lead_score: int = 0
    lead_score_reason: str = ""
    is_chain: bool = False
    chain_reason: str = ""
    branch_count: int = 1

    # служебное
    excluded: bool = False
    exclude_reason: str = ""
    evidence: dict[str, Any] = field(default_factory=dict)
    first_seen_at: str = field(default_factory=utcnow_iso)
    updated_at: str = field(default_factory=utcnow_iso)

    # -- сериализация -------------------------------------------------------

    _JSON_FIELDS = (
        "sources", "source_ids", "other_socials", "detected_domains", "evidence",
    )

    def to_row(self) -> dict[str, Any]:
        row = asdict(self)
        for key in self._JSON_FIELDS:
            row[key] = json.dumps(row[key], ensure_ascii=False)
        row["is_chain"] = int(self.is_chain)
        row["excluded"] = int(self.excluded)
        return row

    @classmethod
    def from_row(cls, row: Any) -> "Place":
        data = dict(row)
        for key in cls._JSON_FIELDS:
            raw = data.get(key)
            if isinstance(raw, str) and raw:
                try:
                    data[key] = json.loads(raw)
                except json.JSONDecodeError:
                    data[key] = [] if key != "evidence" else {}
            elif raw is None:
                data[key] = [] if key != "evidence" else {}
        data["is_chain"] = bool(data.get("is_chain"))
        data["excluded"] = bool(data.get("excluded"))
        known = {f for f in cls.__dataclass_fields__}
        return cls(**{k: v for k, v in data.items() if k in known})

    # -- удобные производные ------------------------------------------------

    @property
    def phones(self) -> list[str]:
        return [p for p in (self.phone or "").split("; ") if p]

    @property
    def coords(self) -> tuple[float | None, float | None]:
        return (self.latitude, self.longitude)

    def social_urls(self) -> list[str]:
        urls = [self.vk_url, self.telegram_url, self.instagram_url, *self.other_socials]
        return [u for u in urls if u]


SCHEMA = """
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;

CREATE TABLE IF NOT EXISTS places (
    place_key            TEXT PRIMARY KEY,
    name                 TEXT NOT NULL,
    normalized_name      TEXT,
    category             TEXT,
    raw_category         TEXT,
    city                 TEXT,
    region               TEXT,
    full_address         TEXT,
    normalized_address   TEXT,
    latitude             REAL,
    longitude            REAL,
    phone                TEXT,
    email                TEXT,
    working_hours        TEXT,
    rating               REAL,
    reviews_count        INTEGER,
    price_level          INTEGER,
    source               TEXT,
    sources              TEXT,
    source_url           TEXT,
    source_ids           TEXT,
    website_from_source  TEXT,
    vk_url               TEXT,
    telegram_url         TEXT,
    instagram_url        TEXT,
    other_socials        TEXT,
    booking_url          TEXT,
    delivery_url         TEXT,
    detected_domains     TEXT,
    website_status       TEXT,
    website_confidence   INTEGER,
    website_check_reason TEXT,
    official_website     TEXT,
    last_checked_at      TEXT,
    lead_score           INTEGER,
    lead_score_reason    TEXT,
    is_chain             INTEGER DEFAULT 0,
    chain_reason         TEXT,
    branch_count         INTEGER DEFAULT 1,
    excluded             INTEGER DEFAULT 0,
    exclude_reason       TEXT,
    evidence             TEXT,
    first_seen_at        TEXT,
    updated_at           TEXT
);

CREATE INDEX IF NOT EXISTS idx_places_city     ON places(city);
CREATE INDEX IF NOT EXISTS idx_places_region   ON places(region);
CREATE INDEX IF NOT EXISTS idx_places_status   ON places(website_status);
CREATE INDEX IF NOT EXISTS idx_places_checked  ON places(last_checked_at);
CREATE INDEX IF NOT EXISTS idx_places_score    ON places(lead_score DESC, website_confidence DESC);
CREATE INDEX IF NOT EXISTS idx_places_normname ON places(normalized_name);

-- Кэш любых внешних проверок: поисковые запросы, HTTP-проверки доменов, VK.
CREATE TABLE IF NOT EXISTS cache (
    cache_key  TEXT PRIMARY KEY,
    namespace  TEXT NOT NULL,
    payload    TEXT NOT NULL,
    created_at REAL NOT NULL,
    expires_at REAL
);
CREATE INDEX IF NOT EXISTS idx_cache_ns  ON cache(namespace);
CREATE INDEX IF NOT EXISTS idx_cache_exp ON cache(expires_at);

-- Прогресс обхода: (источник, город, категория) -> завершено.
CREATE TABLE IF NOT EXISTS harvest_progress (
    scope_key    TEXT PRIMARY KEY,
    source       TEXT NOT NULL,
    city         TEXT,
    region       TEXT,
    category     TEXT,
    status       TEXT NOT NULL,
    found        INTEGER DEFAULT 0,
    error        TEXT,
    updated_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_progress_status ON harvest_progress(status);

CREATE TABLE IF NOT EXISTS runs (
    run_id     TEXT PRIMARY KEY,
    started_at TEXT,
    finished_at TEXT,
    scope      TEXT,
    params     TEXT,
    stats      TEXT
);
"""
