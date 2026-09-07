"""Базовый интерфейс источника данных о заведениях."""
from __future__ import annotations

import abc
from dataclasses import dataclass, field
from typing import Any, AsyncIterator

from config import Config
from utils.cities import City
from utils.http import HttpClient
from utils.logger import get_logger

log = get_logger(__name__)


@dataclass
class RawPlace:
    """Сырое заведение как его отдал источник — до нормализации и дедупликации."""

    source: str
    source_id: str
    name: str
    raw_category: str = ""
    city: str = ""
    region: str = ""
    address: str = ""
    latitude: float | None = None
    longitude: float | None = None
    phones: list[str] = field(default_factory=list)
    email: str = ""
    website: str = ""
    social_urls: list[str] = field(default_factory=list)
    booking_url: str = ""
    delivery_url: str = ""
    working_hours: str = ""
    rating: float | None = None
    reviews_count: int | None = None
    price_level: int | None = None
    source_url: str = ""
    brand: str = ""
    brand_id: str = ""          # brand:wikidata и аналоги — сильный признак сети
    tags: dict[str, Any] = field(default_factory=dict)


class SourceUnavailable(RuntimeError):
    """Источник не сконфигурирован (нет ключа) или отключён политикой доступа."""


class BaseSource(abc.ABC):
    """Источник заведений.

    Наследники обязаны реализовать :meth:`fetch_city`. Всё остальное —
    нормализация, дедупликация, проверки — делается выше по конвейеру.
    """

    #: короткое имя источника, оно же ключ rate-limit'а и значение поля `source`
    name: str = "base"
    #: приоритет при слиянии дублей: чем выше, тем «главнее» поля источника
    priority: int = 0

    def __init__(self, config: Config, http: HttpClient) -> None:
        self.config = config
        self.http = http
        self.creds = config.credentials

    def is_configured(self) -> bool:
        """Есть ли всё необходимое (ключи) для работы источника."""
        return True

    def unavailable_reason(self) -> str:
        return ""

    @abc.abstractmethod
    async def fetch_city(self, city: City, categories: list[str], limit: int) -> list[RawPlace]:
        """Собрать заведения по городу. Должен уважать rate limit источника."""

    async def iter_city(
        self, city: City, categories: list[str], limit: int
    ) -> AsyncIterator[RawPlace]:
        for place in await self.fetch_city(city, categories, limit):
            yield place

    def __repr__(self) -> str:  # pragma: no cover - для логов
        return f"<Source {self.name} priority={self.priority}>"
