"""Реестр источников: включение по конфигу и наличию ключей."""
from __future__ import annotations

from config import Config
from sources.base import BaseSource
from sources.dgis import DGisSource
from sources.osm_overpass import OverpassSource
from sources.yandex_places import YandexPlacesSource
from utils.http import HttpClient
from utils.logger import get_logger

log = get_logger(__name__)

SOURCE_CLASSES: dict[str, type[BaseSource]] = {
    OverpassSource.name: OverpassSource,
    YandexPlacesSource.name: YandexPlacesSource,
    DGisSource.name: DGisSource,
}


def available_source_names() -> list[str]:
    return list(SOURCE_CLASSES)


def build_sources(config: Config, http: HttpClient) -> list[BaseSource]:
    """Создаёт включённые и сконфигурированные источники, по убыванию приоритета."""
    result: list[BaseSource] = []
    for name in config.sources:
        cls = SOURCE_CLASSES.get(name)
        if cls is None:
            log.warning("Неизвестный источник: %s (доступны: %s)", name, ", ".join(SOURCE_CLASSES))
            continue
        source = cls(config, http)
        if not source.is_configured():
            log.info("Источник «%s» пропущен: %s", name, source.unavailable_reason())
            continue
        result.append(source)
    result.sort(key=lambda s: -s.priority)
    if not result:
        log.error("Не включён ни один источник — собирать нечего")
    return result
