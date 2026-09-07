"""Общее для экспортёров: колонки, порядок, сортировка, наборы листов."""
from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from database.models import (
    CHECK_FAILED, HAS_WEBSITE, NO_WEBSITE_HIGH_CONFIDENCE,
    NO_WEBSITE_MEDIUM_CONFIDENCE, Place, UNCERTAIN,
)
from sources.categories import category_label

#: (поле Place, заголовок в файле, ширина колонки, это ссылка?)
COLUMNS: list[tuple[str, str, int, bool]] = [
    ("name",                 "Название",              34, False),
    ("category_label",       "Категория",             20, False),
    ("city",                 "Город",                 18, False),
    ("region",               "Регион",                26, False),
    ("full_address",         "Адрес",                 40, False),
    ("phone",                "Телефон",               22, False),
    ("email",                "E-mail",                24, False),
    ("rating",               "Рейтинг",                9, False),
    ("reviews_count",        "Отзывов",                9, False),
    ("price_level",          "Ценовой сегмент",       10, False),
    ("working_hours",        "Часы работы",           28, False),
    ("lead_score",           "Lead score",            11, False),
    ("website_confidence",   "Confidence «нет сайта»",13, False),
    ("website_status",       "Статус сайта",          28, False),
    ("website_check_reason", "Обоснование",           70, False),
    ("official_website",     "Найденный сайт",        30, True),
    ("website_from_source",  "Сайт из источника",     28, True),
    ("vk_url",               "VK",                    28, True),
    ("telegram_url",         "Telegram",              26, True),
    ("instagram_url",        "Instagram",             26, True),
    ("other_socials_str",    "Другие соцсети",        30, False),
    ("booking_url",          "Бронирование",          24, True),
    ("delivery_url",         "Доставка",              24, True),
    ("detected_domains_str", "Проверенные домены",    32, False),
    ("is_chain_str",         "Сеть",                   8, False),
    ("branch_count",         "Точек с таким именем",  10, False),
    ("lead_score_reason",    "Почему такой lead score", 60, False),
    ("source",               "Источник",              10, False),
    ("sources_str",          "Все источники",         18, False),
    ("source_url",           "Карточка в источнике",  36, True),
    ("latitude",             "Широта",                10, False),
    ("longitude",            "Долгота",               10, False),
    ("last_checked_at",      "Проверено",             22, False),
]

LINK_COLUMNS = {title for _, title, _, is_link in COLUMNS if is_link}


@dataclass
class SheetSpec:
    name: str
    description: str
    statuses: tuple[str, ...] = ()
    min_confidence: int | None = None


SHEETS: list[SheetSpec] = [
    SheetSpec("All leads", "все собранные заведения"),
    SheetSpec(
        "High confidence",
        "сайта почти наверняка нет",
        statuses=(NO_WEBSITE_HIGH_CONFIDENCE,),
    ),
    SheetSpec(
        "Needs review",
        "данных недостаточно — проверить руками",
        statuses=(NO_WEBSITE_MEDIUM_CONFIDENCE, UNCERTAIN),
    ),
    SheetSpec("Has website", "собственный сайт найден и подтверждён", statuses=(HAS_WEBSITE,)),
    SheetSpec("Errors", "проверка не выполнилась", statuses=(CHECK_FAILED,)),
]


def place_to_row(place: Place) -> dict:
    row = {
        "category_label": category_label(place.category),
        "other_socials_str": ", ".join(place.other_socials),
        "detected_domains_str": ", ".join(place.detected_domains),
        "sources_str": ", ".join(place.sources or [place.source]),
        "is_chain_str": "да" if place.is_chain else "нет",
    }
    for field_name, title, _, _ in COLUMNS:
        value = row.get(field_name, getattr(place, field_name, ""))
        row[title] = value
    return {title: row[title] for _, title, _, _ in COLUMNS}


def places_to_frame(places: list[Place]) -> pd.DataFrame:
    frame = pd.DataFrame([place_to_row(p) for p in places])
    if frame.empty:
        frame = pd.DataFrame(columns=[title for _, title, _, _ in COLUMNS])
    return sort_frame(frame)


def sort_frame(frame: pd.DataFrame) -> pd.DataFrame:
    """lead_score DESC, затем website_confidence DESC, затем отзывы DESC."""
    keys = [k for k in ("Lead score", "Confidence «нет сайта»", "Отзывов") if k in frame.columns]
    if not keys:
        return frame
    return frame.sort_values(by=keys, ascending=[False] * len(keys), kind="mergesort").reset_index(drop=True)


def filter_places(places: list[Place], spec: SheetSpec) -> list[Place]:
    result = places
    if spec.statuses:
        result = [p for p in result if p.website_status in spec.statuses]
    if spec.min_confidence is not None:
        result = [p for p in result if p.website_confidence >= spec.min_confidence]
    return result
