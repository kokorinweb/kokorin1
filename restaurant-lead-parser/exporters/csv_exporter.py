"""Экспорт в CSV (UTF-8 с BOM — чтобы Excel открывал кириллицу корректно)."""
from __future__ import annotations

from pathlib import Path

from database.models import Place
from exporters.common import places_to_frame
from utils.logger import get_logger

log = get_logger(__name__)


def export_csv(places: list[Place], path: str | Path) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    frame = places_to_frame(places)
    frame.to_csv(target, index=False, encoding="utf-8-sig", sep=";")
    log.info("CSV сохранён: %s (%d строк)", target, len(frame))
    return target
