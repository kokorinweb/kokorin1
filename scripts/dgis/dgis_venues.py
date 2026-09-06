#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Сбор заведений общепита из 2ГИС и отбор тех, у кого НЕТ сайта.

Зачем: получить список кафе/ресторанов/баров с телефоном или соцсетями, но без
собственного сайта — это готовый список лидов на разработку сайта.

═══════════════════════════════════════════════════════════════════════════════
 ГДЕ ВЗЯТЬ КЛЮЧ CATALOG API 2ГИС
═══════════════════════════════════════════════════════════════════════════════
1. Документация: https://docs.2gis.com/ru/api/search/places/overview
2. Заявка на ключ: https://dev.2gis.ru/order/ (или https://partner.api.2gis.ru/ —
   личный кабинет, там же статистика по запросам и текущие лимиты).
   Ключ выдают не мгновенно: заявку смотрит менеджер, обычно 1-3 рабочих дня.
3. Для «пощупать» в документации есть публичный демо-ключ `ruxlv3bwdz`. Он живёт
   в примерах доков, жёстко порезан по лимитам и по составу полей, и его в любой
   момент могут отключить. Для реального сбора он не годится — берите свой.

ЛИМИТЫ (важно, читайте внимательно):
  • Точные квоты 2ГИС не публикует единой таблицей и меняет их: они привязаны к
    вашему тарифу и видны в личном кабинете partner.api.2gis.ru. Поэтому НЕ
    полагайтесь на цифры из чужих статей — смотрите свой кабинет.
  • Бесплатный/стартовый доступ обычно ограничен по числу запросов в сутки и по
    доступным полям. Практическое следствие: `items.reviews` (рейтинг и число
    отзывов) на бесплатном ключе часто НЕДОСТУПЕН — API вернёт 400 на этот field.
    Скрипт это переживает: см. FIELDS_OPTIONAL и авто-фолбэк на минимальный набор
    полей. В CSV колонки рейтинга просто останутся пустыми.
  • Отдельное ограничение, не связанное с квотой: выдача одного поискового
    запроса ограничена сверху — глубоко пролистать «все кафе города» одним
    запросом нельзя, API перестанет отдавать items задолго до `total`. Скрипт
    честно логирует «получено N из total M». Лечится дроблением: не «кафе по
    городу целиком», а «кафе + конкретный район/станция метро», либо несколько
    близких рубрик (кафе, кофейня, столовая, пиццерия...). См. CONFIG.

═══════════════════════════════════════════════════════════════════════════════
 КАК ЗАПУСТИТЬ
═══════════════════════════════════════════════════════════════════════════════
    # 1. зависимости (только requests и pandas)
    python3 -m venv .venv && source .venv/bin/activate
    pip install -r scripts/dgis/requirements.txt
    #    или: pip install requests pandas

    # 2. ключ через переменную окружения
    export DGIS_API_KEY="ваш_ключ"          # Windows CMD:  set DGIS_API_KEY=...
                                            # PowerShell:   $env:DGIS_API_KEY="..."

    # 3. запуск: город и категории берутся из CONFIG ниже
    python scripts/dgis/dgis_venues.py

    # или переопределить из командной строки
    python scripts/dgis/dgis_venues.py --city "Казань" --category кафе --category бар \
        --max 1500 --out kazan_leads.csv

    # сохранить ещё и полную выгрузку (до фильтра), чтобы было что перепроверить
    python scripts/dgis/dgis_venues.py --all-csv kazan_all.csv

Результат — CSV в кодировке UTF-8 с BOM: Excel открывает кириллицу без плясок с
«Импортом данных».
"""

from __future__ import annotations

import argparse
import logging
import os
import random
import re
import sys
import time
from dataclasses import asdict, dataclass, field
from typing import Any, Iterable, Iterator, Sequence
from urllib.parse import urlparse

import pandas as pd
import requests

# ═══════════════════════════════════════════════════════════════════════════════
# КОНФИГ
# ═══════════════════════════════════════════════════════════════════════════════

CONFIG: dict[str, Any] = {
    # Город. Скрипт сначала находит его region_id через /2.0/region/search,
    # а если не нашёл — просто подмешивает название города в поисковый запрос.
    "city": "Новосибирск",

    # Категории. Это обычный поисковый запрос 2ГИС, а не строгий справочник рубрик.
    # Чем больше близких категорий — тем полнее охват (см. ограничение глубины
    # выдачи в шапке файла).
    "categories": [
        "кафе",
        "ресторан",
        "бар",
        # "кофейня", "столовая", "пиццерия", "суши-бар", "пекарня", "кальянная",
    ],

    # Максимум организаций НА КАТЕГОРИЮ (до фильтрации и дедупликации).
    "max_results": 1000,

    # Размер страницы. У 2ГИС потолок — 50.
    "page_size": 50,

    # Пауза между запросами, секунды (случайная в этом диапазоне).
    "delay_range": (0.5, 1.0),

    # Куда писать отфильтрованный результат.
    "output_csv": "dgis_no_website.csv",

    # Куда писать полную выгрузку до фильтра. None — не писать.
    "output_all_csv": None,

    # Считать ли e-mail самостоятельным способом связи.
    # По ТЗ достаточно телефона или соцсети, e-mail не в счёт. Поставьте True,
    # если хотите ловить и тех, у кого только почта.
    "count_email_as_contact": False,

    # Если в поле «сайт» стоит ссылка на соцсеть/агрегатор (vk.com, instagram,
    # taplink, yandex-карты, delivery-club...), считать, что сайта НЕТ, а ссылку
    # переложить в соцсети. Это и есть настоящая целевая аудитория: «сайт» у них
    # формально заполнен, а по факту это страница ВК.
    "social_link_is_not_a_website": True,

    # Тайм-аут HTTP-запроса и число повторов при сетевых ошибках/429/5xx.
    "request_timeout": 20,
    "max_retries": 3,

    # Предохранитель от бесконечного цикла, если API вдруг начнёт зацикливать выдачу.
    "max_pages_per_category": 200,
}

# ═══════════════════════════════════════════════════════════════════════════════
# КОНСТАНТЫ API
# ═══════════════════════════════════════════════════════════════════════════════

ITEMS_URL = "https://catalog.api.2gis.com/3.0/items"
REGION_URL = "https://catalog.api.2gis.com/2.0/region/search"

# Поля, без которых скрипт бессмысленен.
FIELDS_REQUIRED = [
    "items.address",
    "items.adm_div",
    "items.contact_groups",
    "items.rubrics",
]
# Поля, которых может не быть на бесплатном тарифе. При 400 они отбрасываются.
FIELDS_OPTIONAL = [
    "items.schedule",
    "items.reviews",
    "items.full_address_name",
    "items.name_ex",
    "items.point",
]

# Типы контактов 2ГИС → колонки CSV.
SOCIAL_TYPES = {
    "vk": "vk",
    "vkontakte": "vk",
    "telegram": "telegram",
    "instagram": "instagram",
}
# Прочие мессенджеры/соцсети — не отдельные колонки, но считаются «способом связи».
OTHER_SOCIAL_TYPES = {
    "whatsapp", "viber", "facebook", "odnoklassniki", "youtube", "twitter",
    "tiktok", "skype", "dzen", "rutube", "max",
}

# Домены, которые сайтом не являются.
SOCIAL_DOMAINS = {
    "vk.com": "vk", "vk.ru": "vk", "m.vk.com": "vk", "vkontakte.ru": "vk",
    "t.me": "telegram", "telegram.me": "telegram", "tlgg.ru": "telegram",
    "instagram.com": "instagram", "instagr.am": "instagram",
}
AGGREGATOR_DOMAINS = {
    "taplink.cc", "taplink.ru", "linktr.ee", "wa.me", "api.whatsapp.com",
    "facebook.com", "ok.ru", "youtube.com", "yandex.ru", "2gis.ru",
    "delivery-club.ru", "eda.yandex.ru", "restoclub.ru", "tripadvisor.ru",
    "zoon.ru", "flamp.ru", "sites.google.com", "wa.clck.bar",
}

DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
DAY_RU = {"Mon": "Пн", "Tue": "Вт", "Wed": "Ср", "Thu": "Чт",
          "Fri": "Пт", "Sat": "Сб", "Sun": "Вс"}

log = logging.getLogger("dgis")


class DgisFatalError(RuntimeError):
    """Ошибка, после которой продолжать бессмысленно: битый ключ, кончилась квота."""


class DgisBadRequest(RuntimeError):
    """400 от API — обычно кривой набор fields для текущего тарифа."""


# ═══════════════════════════════════════════════════════════════════════════════
# МОДЕЛЬ
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Venue:
    name: str = ""
    address: str = ""
    district: str = ""
    phone: str = ""
    website: str = ""
    email: str = ""
    vk: str = ""
    telegram: str = ""
    instagram: str = ""
    schedule: str = ""
    rubric: str = ""
    rating: str = ""
    reviews_count: str = ""
    # Служебное: по какому запросу нашли и ссылка на карточку — удобно проверять руками.
    query: str = ""
    dgis_url: str = ""
    _other_socials: list[str] = field(default_factory=list, repr=False)

    def has_social(self) -> bool:
        return bool(self.vk or self.telegram or self.instagram or self._other_socials)

    def dedup_key(self) -> str:
        return f"{normalize_for_key(self.name)}|{normalize_for_key(self.address)}"

    def to_row(self) -> dict[str, str]:
        row = {k: v for k, v in asdict(self).items() if not k.startswith("_")}
        return row


CSV_COLUMNS = [
    ("name", "Название"),
    ("address", "Адрес"),
    ("district", "Район"),
    ("phone", "Телефон"),
    ("website", "Сайт"),
    ("email", "Email"),
    ("vk", "VK"),
    ("telegram", "Telegram"),
    ("instagram", "Instagram"),
    ("schedule", "Режим работы"),
    ("rubric", "Рубрика"),
    ("rating", "Рейтинг"),
    ("reviews_count", "Отзывов"),
    ("query", "Запрос"),
    ("dgis_url", "Карточка 2ГИС"),
]


# ═══════════════════════════════════════════════════════════════════════════════
# ХЕЛПЕРЫ ПАРСИНГА
# ═══════════════════════════════════════════════════════════════════════════════

def normalize_for_key(value: str) -> str:
    """Нормализация для дедупликации: регистр, кавычки, лишние пробелы, «ё»."""
    value = (value or "").lower().replace("ё", "е")
    value = re.sub(r"[«»\"'`’]", "", value)
    value = re.sub(r"[^0-9a-zа-я]+", " ", value)
    return value.strip()


def normalize_phone(raw: str) -> str:
    """+7 999 123-45-67 → +79991234567. Мусор оставляем как есть."""
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 11 and digits[0] in "78":
        return "+7" + digits[1:]
    if len(digits) == 10:
        return "+7" + digits
    return (raw or "").strip()


def domain_of(url: str) -> str:
    if not url:
        return ""
    if "://" not in url:
        url = "http://" + url
    try:
        host = urlparse(url).netloc.lower()
    except ValueError:
        return ""
    return host[4:] if host.startswith("www.") else host


def is_social_or_aggregator(url: str) -> str | None:
    """Возвращает 'vk'/'telegram'/'instagram' / 'other' для не-сайтов, иначе None."""
    host = domain_of(url)
    if not host:
        return None
    if host in SOCIAL_DOMAINS:
        return SOCIAL_DOMAINS[host]
    if host in AGGREGATOR_DOMAINS:
        return "other"
    return None


def contact_value(contact: dict[str, Any]) -> str:
    """У 2ГИС значение лежит то в value, то в url, то в text — берём первое живое."""
    for key in ("value", "url", "text"):
        val = contact.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return ""


def format_schedule(schedule: dict[str, Any] | None) -> str:
    """{'Mon': {'working_hours': [...]}} → 'Пн-Пт 09:00-22:00; Сб-Вс 10:00-23:00'."""
    if not isinstance(schedule, dict):
        return ""
    if schedule.get("is_24x7"):
        return "круглосуточно"

    per_day: list[tuple[str, str]] = []
    for day in DAY_KEYS:
        info = schedule.get(day)
        if not isinstance(info, dict):
            per_day.append((day, ""))
            continue
        hours = info.get("working_hours") or []
        parts = [
            f"{h.get('from', '')}-{h.get('to', '')}"
            for h in hours
            if isinstance(h, dict) and (h.get("from") or h.get("to"))
        ]
        per_day.append((day, ", ".join(parts)))

    # Схлопываем подряд идущие одинаковые дни: Пн,Вт,Ср → Пн-Ср.
    chunks: list[str] = []
    idx = 0
    while idx < len(per_day):
        end = idx
        while end + 1 < len(per_day) and per_day[end + 1][1] == per_day[idx][1]:
            end += 1
        hours = per_day[idx][1]
        if hours:
            label = DAY_RU[per_day[idx][0]]
            if end > idx:
                label += "-" + DAY_RU[per_day[end][0]]
            chunks.append(f"{label} {hours}")
        idx = end + 1

    result = "; ".join(chunks)
    comment = schedule.get("comment")
    if isinstance(comment, str) and comment.strip():
        result = f"{result} ({comment.strip()})" if result else comment.strip()
    return result


def parse_item(item: dict[str, Any], query: str, cfg: dict[str, Any]) -> Venue:
    """Одна организация из ответа API → Venue."""
    venue = Venue(query=query)

    name_ex = item.get("name_ex") or {}
    venue.name = (name_ex.get("primary") or item.get("name") or "").strip()

    venue.address = (
        item.get("full_address_name")
        or item.get("address_name")
        or (item.get("address") or {}).get("name")
        or ""
    ).strip()

    # Район: сначала district_area (микрорайон), потом district.
    adm_div = item.get("adm_div") or []
    by_type = {
        d.get("type"): (d.get("name") or "").strip()
        for d in adm_div
        if isinstance(d, dict)
    }
    venue.district = by_type.get("district") or by_type.get("district_area") or ""
    city = by_type.get("city") or ""
    if city and venue.address and city.lower() not in venue.address.lower():
        venue.address = f"{city}, {venue.address}"

    rubrics = [
        (r.get("name") or "").strip()
        for r in (item.get("rubrics") or [])
        if isinstance(r, dict) and r.get("name")
    ]
    venue.rubric = ", ".join(dict.fromkeys(rubrics))

    reviews = item.get("reviews") or {}
    rating = reviews.get("general_rating") or reviews.get("org_rating")
    count = reviews.get("general_review_count") or reviews.get("org_review_count")
    venue.rating = "" if rating is None else str(rating)
    venue.reviews_count = "" if count is None else str(count)

    venue.schedule = format_schedule(item.get("schedule"))

    item_id = item.get("id") or ""
    if item_id:
        venue.dgis_url = f"https://2gis.ru/firm/{str(item_id).split('_')[0]}"

    # ── Контакты ──────────────────────────────────────────────────────────────
    phones: list[str] = []
    emails: list[str] = []
    websites: list[str] = []
    for group in item.get("contact_groups") or []:
        for contact in (group or {}).get("contacts") or []:
            if not isinstance(contact, dict):
                continue
            ctype = (contact.get("type") or "").lower()
            value = contact_value(contact)
            if not value:
                continue
            if ctype == "phone":
                phones.append(normalize_phone(value))
            elif ctype in ("email", "general_email"):
                emails.append(value)
            elif ctype == "website":
                websites.append(value)
            elif ctype in SOCIAL_TYPES:
                setattr(venue, SOCIAL_TYPES[ctype], getattr(venue, SOCIAL_TYPES[ctype]) or value)
            elif ctype in OTHER_SOCIAL_TYPES:
                venue._other_socials.append(f"{ctype}: {value}")

    # Ссылка на соцсеть, положенная в поле «сайт», сайтом не считается.
    real_sites: list[str] = []
    for url in websites:
        kind = is_social_or_aggregator(url) if cfg["social_link_is_not_a_website"] else None
        if kind in ("vk", "telegram", "instagram"):
            if not getattr(venue, kind):
                setattr(venue, kind, url)
        elif kind == "other":
            venue._other_socials.append(url)
        else:
            real_sites.append(url)

    venue.phone = ", ".join(dict.fromkeys(p for p in phones if p))
    venue.email = ", ".join(dict.fromkeys(emails))
    venue.website = ", ".join(dict.fromkeys(real_sites))
    return venue


# ═══════════════════════════════════════════════════════════════════════════════
# КЛИЕНТ API
# ═══════════════════════════════════════════════════════════════════════════════

class DgisCatalogClient:
    def __init__(self, api_key: str, cfg: dict[str, Any]) -> None:
        self.api_key = api_key
        self.cfg = cfg
        self.session = requests.Session()
        self.session.headers["User-Agent"] = "dgis-venues-collector/1.0"
        self.fields = FIELDS_REQUIRED + FIELDS_OPTIONAL
        self.requests_made = 0

    # ── низкий уровень ────────────────────────────────────────────────────────
    def _sleep(self) -> None:
        time.sleep(random.uniform(*self.cfg["delay_range"]))

    def _get(self, url: str, params: dict[str, Any]) -> dict[str, Any] | None:
        """Один запрос с повторами. None — не смогли, вызывающий идёт дальше."""
        params = {**params, "key": self.api_key}
        for attempt in range(1, self.cfg["max_retries"] + 1):
            try:
                self.requests_made += 1
                resp = self.session.get(url, params=params, timeout=self.cfg["request_timeout"])
            except requests.RequestException as exc:
                log.warning("Сетевая ошибка (попытка %s/%s): %s",
                            attempt, self.cfg["max_retries"], exc)
                time.sleep(2 ** attempt)
                continue

            if resp.status_code == 429 or resp.status_code >= 500:
                # 429 — уткнулись в rate limit, 5xx — на той стороне плохо.
                # И то и другое лечится ожиданием.
                wait = 2 ** attempt * 2
                log.warning("HTTP %s от API, ждём %s c (попытка %s/%s)",
                            resp.status_code, wait, attempt, self.cfg["max_retries"])
                time.sleep(wait)
                continue

            try:
                data = resp.json()
            except ValueError:
                log.warning("Ответ не JSON (HTTP %s): %.200s", resp.status_code, resp.text)
                time.sleep(2 ** attempt)
                continue

            meta = data.get("meta") or {}
            code = meta.get("code", resp.status_code)
            message = ((meta.get("error") or {}).get("message") or "").strip()

            if code == 200:
                return data
            if code == 404:
                # «Results not found» — легальный конец выдачи, не ошибка.
                return data
            if code in (401, 403):
                raise DgisFatalError(
                    f"HTTP {code}: {message or 'ключ отклонён или исчерпана квота'}. "
                    "Проверьте DGIS_API_KEY и лимиты в partner.api.2gis.ru."
                )
            if code == 400:
                raise DgisBadRequest(message or "Bad Request")

            log.warning("API вернул код %s: %s (попытка %s/%s)",
                        code, message, attempt, self.cfg["max_retries"])
            time.sleep(2 ** attempt)

        log.error("Запрос не удался после %s попыток: %s", self.cfg["max_retries"], params.get("q"))
        return None

    # ── регион ────────────────────────────────────────────────────────────────
    def resolve_region_id(self, city: str) -> str | None:
        try:
            data = self._get(REGION_URL, {"q": city, "fields": "items.bounds"})
        except DgisBadRequest as exc:
            log.warning("Не удалось найти регион «%s»: %s", city, exc)
            return None
        items = ((data or {}).get("result") or {}).get("items") or []
        if not items:
            log.warning("Регион «%s» не найден — город подмешаю прямо в поисковый запрос.", city)
            return None
        region = items[0]
        log.info("Регион: %s (region_id=%s)", region.get("name"), region.get("id"))
        return str(region.get("id"))

    # ── постраничный обход ────────────────────────────────────────────────────
    def search(self, query: str, region_id: str | None, city: str,
               max_results: int) -> Iterator[dict[str, Any]]:
        page_size = min(int(self.cfg["page_size"]), 50)
        collected = 0
        total: int | None = None
        page = 1
        fields_reduced = False

        while page <= self.cfg["max_pages_per_category"] and collected < max_results:
            params: dict[str, Any] = {
                "q": query if region_id else f"{query} {city}",
                "page": page,
                "page_size": page_size,
                "fields": ",".join(self.fields),
                "type": "branch",   # филиалы организаций, а не здания/улицы
                "locale": "ru_RU",
            }
            if region_id:
                params["region_id"] = region_id

            try:
                data = self._get(ITEMS_URL, params)
            except DgisBadRequest as exc:
                # Чаще всего это «поле недоступно на вашем тарифе». Один раз
                # ужимаемся до обязательных полей и пробуем ту же страницу снова.
                if not fields_reduced:
                    log.warning("400 от API (%s). Убираю необязательные поля и повторяю.", exc)
                    self.fields = list(FIELDS_REQUIRED)
                    fields_reduced = True
                    self._sleep()
                    continue
                log.error("400 от API даже на минимальном наборе полей: %s. "
                          "Пропускаю страницу %s.", exc, page)
                page += 1
                self._sleep()
                continue

            if data is None:
                # Страница не далась — по ТЗ не падаем, идём дальше.
                log.error("Страница %s запроса «%s» пропущена.", page, query)
                page += 1
                self._sleep()
                continue

            result = data.get("result") or {}
            items = result.get("items") or []
            if total is None:
                total = result.get("total")
                if total is not None:
                    log.info("«%s»: всего в 2ГИС %s", query, total)

            if not items:
                log.info("«%s»: выдача закончилась на странице %s.", query, page)
                break

            for item in items:
                if collected >= max_results:
                    break
                collected += 1
                yield item

            log.info("«%s»: страница %s, получено %s/%s", query, page, collected,
                     min(total or max_results, max_results))

            if len(items) < page_size:
                break
            page += 1
            self._sleep()

        if total and collected < min(total, max_results):
            log.warning(
                "«%s»: получено %s из %s. 2ГИС ограничивает глубину выдачи — "
                "дробите запрос (по районам или более узким рубрикам).",
                query, collected, total,
            )


# ═══════════════════════════════════════════════════════════════════════════════
# СБОР, ФИЛЬТР, ВЫГРУЗКА
# ═══════════════════════════════════════════════════════════════════════════════

def passes_filter(venue: Venue, cfg: dict[str, Any]) -> bool:
    """Нет сайта, но есть телефон или соцсеть (опционально — e-mail)."""
    if venue.website.strip():
        return False
    has_contact = bool(venue.phone) or venue.has_social()
    if cfg["count_email_as_contact"]:
        has_contact = has_contact or bool(venue.email)
    return has_contact


def collect(client: DgisCatalogClient, cfg: dict[str, Any],
            all_venues: list[Venue], matched: list[Venue]) -> int:
    """Собирает организации в переданные списки. Возвращает код выхода.

    Списки приходят снаружи специально: если посреди работы кончится квота или
    пользователь нажмёт Ctrl+C, всё уже собранное останется у вызывающего и
    попадёт в CSV.
    """
    city = cfg["city"]
    region_id = client.resolve_region_id(city)

    seen: set[str] = set()
    duplicates = 0
    exit_code = 0

    for category in cfg["categories"]:
        log.info("─" * 70)
        log.info("Категория: %s (%s)", category, city)
        before = len(all_venues)
        try:
            for item in client.search(category, region_id, city, int(cfg["max_results"])):
                venue = parse_item(item, category, cfg)
                if not venue.name:
                    continue
                key = venue.dedup_key()
                if key in seen:
                    duplicates += 1
                    continue
                seen.add(key)
                all_venues.append(venue)
                if passes_filter(venue, cfg):
                    matched.append(venue)
        except DgisFatalError as exc:
            # Ключ отклонён или кончилась квота: дальше долбить API бессмысленно.
            log.error("Остановка на категории «%s»: %s", category, exc)
            exit_code = 1
        except KeyboardInterrupt:
            log.warning("Прервано пользователем на категории «%s».", category)
            exit_code = 130
        log.info("Категория «%s»: +%s новых, всего уникальных %s, под фильтр подходит %s",
                 category, len(all_venues) - before, len(all_venues), len(matched))
        if exit_code:
            break

    log.info("─" * 70)
    log.info("ИТОГО: обработано уникальных организаций %s, дубликатов отброшено %s, "
             "без сайта но с контактом — %s (%.1f%%), запросов к API %s",
             len(all_venues), duplicates, len(matched),
             100 * len(matched) / len(all_venues) if all_venues else 0.0,
             client.requests_made)
    return exit_code


def write_csv(venues: Sequence[Venue], path: str) -> None:
    """CSV с UTF-8 BOM — чтобы Excel не ломал кириллицу."""
    columns = [c for c, _ in CSV_COLUMNS]
    titles = {c: t for c, t in CSV_COLUMNS}
    frame = pd.DataFrame([v.to_row() for v in venues], columns=columns)
    frame = frame.rename(columns=titles)
    if not frame.empty:
        frame = frame.sort_values(by=["Район", "Название"], kind="stable")
    frame.to_csv(path, index=False, encoding="utf-8-sig")
    log.info("Записано %s строк → %s", len(frame), os.path.abspath(path))


# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════

def build_config(argv: Sequence[str] | None = None) -> dict[str, Any]:
    parser = argparse.ArgumentParser(
        description="Сбор заведений общепита из 2ГИС и отбор тех, у кого нет сайта.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--city", default=CONFIG["city"], help="Город")
    parser.add_argument("--category", action="append", dest="categories",
                        help="Категория; можно повторять. По умолчанию — список из CONFIG")
    parser.add_argument("--max", type=int, default=CONFIG["max_results"],
                        dest="max_results", help="Максимум организаций на категорию")
    parser.add_argument("--out", default=CONFIG["output_csv"], dest="output_csv",
                        help="CSV с отфильтрованным результатом")
    parser.add_argument("--all-csv", default=CONFIG["output_all_csv"], dest="output_all_csv",
                        help="CSV со всей выгрузкой до фильтра")
    parser.add_argument("--email-is-contact", action="store_true",
                        help="Считать e-mail достаточным способом связи")
    args = parser.parse_args(argv)

    cfg = dict(CONFIG)
    cfg["city"] = args.city
    cfg["categories"] = args.categories or CONFIG["categories"]
    cfg["max_results"] = args.max_results
    cfg["output_csv"] = args.output_csv
    cfg["output_all_csv"] = args.output_all_csv
    if args.email_is_contact:
        cfg["count_email_as_contact"] = True
    return cfg


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-7s %(message)s",
        datefmt="%H:%M:%S",
        stream=sys.stdout,
    )


def main(argv: Sequence[str] | None = None) -> int:
    setup_logging()
    cfg = build_config(argv)

    api_key = os.environ.get("DGIS_API_KEY", "").strip()
    if not api_key:
        log.error("Не задан DGIS_API_KEY. Получить ключ: https://dev.2gis.ru/order/ , затем:\n"
                  '    export DGIS_API_KEY="ваш_ключ"')
        return 2

    client = DgisCatalogClient(api_key, cfg)
    all_venues: list[Venue] = []
    matched: list[Venue] = []
    exit_code = collect(client, cfg, all_venues, matched)

    if matched or all_venues:
        write_csv(matched, cfg["output_csv"])
        if cfg["output_all_csv"]:
            write_csv(all_venues, cfg["output_all_csv"])
    else:
        log.warning("Собирать нечего — CSV не записан.")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
