#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ЗАПАСНОЙ вариант сбора заведений из 2ГИС — парсинг публичных страниц 2gis.ru
без Catalog API. Формат CSV тот же, фильтр и дедупликация переиспользуются из
dgis_venues.py.

═══════════════════════════════════════════════════════════════════════════════
 ⚠ ПРОЧТИТЕ ДО ЗАПУСКА
═══════════════════════════════════════════════════════════════════════════════
1. РИСК БЛОКИРОВКИ. Автоматический обход 2gis.ru противоречит пользовательскому
   соглашению сайта. Практика простая: сначала прилетает 403/429, потом капча,
   потом IP отправляется в бан — и с этого IP сайт перестаёт открываться и в
   браузере. Если это рабочий или домашний IP офиса — пострадают все, кто за ним
   сидит. Юридическую сторону (ToS, ст. 1334 ГК о базах данных) оцените сами.

2. ЭТО ХУЖЕ API, А НЕ «ТО ЖЕ САМОЕ БЕСПЛАТНО». 2gis.ru — SPA: карточки
   дорисовывает JavaScript, и в голом HTML данных может не оказаться вовсе.
   Скрипт вытаскивает то, что лежит во встроенном JSON начального состояния и в
   разметке JSON-LD. Этот JSON — их внутренняя деталь реализации: сегодня он
   есть, завтра переименован, и парсер молча вернёт ноль. Никакой гарантии, что
   вы получите телефоны и соцсети, тут нет.

3. ЧЕГО ЗДЕСЬ СОЗНАТЕЛЬНО НЕТ: ротации прокси, решения капчи, вытаскивания
   внутренних ключей их веб-приложения. Это уже не «сбор публичных данных», а
   обход защиты, и делать этого я не буду. Есть только смена User-Agent,
   человеческие паузы и честная остановка при блокировке.

4. ПРАВИЛЬНОЕ РЕШЕНИЕ, ЕСЛИ НЕ ХВАТАЕТ ЛИМИТОВ API: не парсить сайт, а дробить
   запросы (кафе + каждый район отдельно, больше узких рубрик), растянуть сбор
   на несколько дней или взять платный тариф. Данные в 2ГИС меняются медленно —
   спешить некуда.

Запуск (флаг обязателен, чтобы нельзя было запустить случайно):

    pip install requests pandas
    python scripts/dgis/dgis_venues_scraper.py --i-understand-the-risks \
        --city "Новосибирск" --category кафе --max 200 --out leads_web.csv
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import random
import re
import sys
import time
from typing import Any, Iterator, Sequence
from urllib.parse import quote

import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dgis_venues import (  # noqa: E402  — импорт после правки sys.path
    CONFIG,
    Venue,
    parse_item,
    passes_filter,
    setup_logging,
    write_csv,
)

log = logging.getLogger("dgis.scraper")

# Пул User-Agent. Смысл ротации — не «обмануть защиту», а не выглядеть одним
# зависшим клиентом. От нормального антибота это не спасает.
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:126.0) Gecko/20100101 Firefox/126.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
]

# Паузы на сайте берём заметно длиннее, чем для API.
WEB_DELAY_RANGE = (2.0, 4.5)
MAX_BLOCKS_IN_A_ROW = 3

# Встроенный в страницу JSON начального состояния — их внутренняя деталь.
STATE_PATTERNS = [
    re.compile(r"window\.__\$\$initialState\s*=\s*(\{.*?\});?\s*</script>", re.S),
    re.compile(r"window\.__initialState\s*=\s*(\{.*?\});?\s*</script>", re.S),
    re.compile(r'<script[^>]+id="__NEXT_DATA__"[^>]*>(\{.*?\})</script>', re.S),
]
LD_JSON_PATTERN = re.compile(
    r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>', re.S
)

CITY_SLUGS = {
    "москва": "moscow", "санкт-петербург": "spb", "новосибирск": "novosibirsk",
    "екатеринбург": "ekaterinburg", "казань": "kazan", "нижний новгород": "n_novgorod",
    "челябинск": "chelyabinsk", "омск": "omsk", "самара": "samara",
    "ростов-на-дону": "rostov", "уфа": "ufa", "красноярск": "krasnoyarsk",
    "воронеж": "voronezh", "пермь": "perm", "волгоград": "volgograd",
    "краснодар": "krasnodar", "тюмень": "tyumen", "барнаул": "barnaul",
    "иркутск": "irkutsk", "хабаровск": "khabarovsk", "владивосток": "vladivostok",
}


class Blocked(RuntimeError):
    """Нас узнали и не пускают."""


def city_slug(city: str) -> str:
    return CITY_SLUGS.get(city.strip().lower(), "")


def iter_org_dicts(node: Any, depth: int = 0) -> Iterator[dict[str, Any]]:
    """Рекурсивно достаёт из произвольного JSON словари, похожие на организацию.

    Опознаём по набору ключей: у сайта внутренний формат близок к формату
    Catalog API, поэтому найденное можно скормить тому же parse_item.
    """
    if depth > 12:
        return
    if isinstance(node, dict):
        looks_like_org = bool(node.get("name")) and (
            "contact_groups" in node
            or "address_name" in node
            or "full_address_name" in node
            or ("adm_div" in node and "rubrics" in node)
        )
        if looks_like_org:
            yield node
        for value in node.values():
            yield from iter_org_dicts(value, depth + 1)
    elif isinstance(node, list):
        for value in node:
            yield from iter_org_dicts(value, depth + 1)


def ld_json_to_item(payload: dict[str, Any]) -> dict[str, Any] | None:
    """schema.org-разметка карточки → структура, понятная parse_item."""
    types = payload.get("@type")
    types = types if isinstance(types, list) else [types]
    if not any(isinstance(t, str) and t.endswith(("Restaurant", "Business", "Cafe",
                                                  "BarOrPub", "FoodEstablishment",
                                                  "Organization", "Place"))
               for t in types if t):
        return None

    address = payload.get("address")
    if isinstance(address, dict):
        address = ", ".join(
            str(address.get(k, "")).strip()
            for k in ("addressLocality", "streetAddress")
            if address.get(k)
        )
    contacts: list[dict[str, str]] = []
    if payload.get("telephone"):
        contacts.append({"type": "phone", "value": str(payload["telephone"])})
    if payload.get("email"):
        contacts.append({"type": "email", "value": str(payload["email"])})
    if payload.get("url"):
        contacts.append({"type": "website", "value": str(payload["url"])})
    for same_as in payload.get("sameAs") or []:
        contacts.append({"type": "website", "value": str(same_as)})

    rating = (payload.get("aggregateRating") or {}) if isinstance(
        payload.get("aggregateRating"), dict) else {}
    return {
        "name": payload.get("name") or "",
        "full_address_name": address or "",
        "contact_groups": [{"contacts": contacts}] if contacts else [],
        "rubrics": [{"name": payload.get("servesCuisine")}]
        if isinstance(payload.get("servesCuisine"), str) else [],
        "reviews": {
            "general_rating": rating.get("ratingValue"),
            "general_review_count": rating.get("reviewCount") or rating.get("ratingCount"),
        },
    }


class DgisWebScraper:
    def __init__(self, cfg: dict[str, Any]) -> None:
        self.cfg = cfg
        self.session = requests.Session()
        self.blocks_in_a_row = 0
        self.pages_fetched = 0

    def _headers(self) -> dict[str, str]:
        return {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ru-RU,ru;q=0.9",
            "Connection": "keep-alive",
        }

    def fetch(self, url: str) -> str | None:
        for attempt in range(1, 4):
            try:
                resp = self.session.get(url, headers=self._headers(), timeout=25)
            except requests.RequestException as exc:
                log.warning("Сетевая ошибка (%s/3): %s", attempt, exc)
                time.sleep(2 ** attempt)
                continue

            self.pages_fetched += 1
            if resp.status_code in (403, 429) or "captcha" in resp.text[:4000].lower():
                self.blocks_in_a_row += 1
                wait = 10 * attempt
                log.warning("Похоже на блокировку (HTTP %s), подряд %s раз. Пауза %s c.",
                            resp.status_code, self.blocks_in_a_row, wait)
                if self.blocks_in_a_row >= MAX_BLOCKS_IN_A_ROW:
                    raise Blocked(
                        "2ГИС стабильно отдаёт блокировку. Продолжать — верный способ "
                        "получить бан IP. Останавливаюсь; берите Catalog API."
                    )
                time.sleep(wait)
                continue
            if resp.status_code >= 500:
                time.sleep(2 ** attempt * 2)
                continue
            if resp.status_code != 200:
                log.warning("HTTP %s на %s", resp.status_code, url)
                return None

            self.blocks_in_a_row = 0
            return resp.text
        return None

    def parse_page(self, html: str) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []

        for pattern in STATE_PATTERNS:
            match = pattern.search(html)
            if not match:
                continue
            try:
                state = json.loads(match.group(1))
            except ValueError:
                continue
            items.extend(iter_org_dicts(state))
            if items:
                break

        if not items:
            for raw in LD_JSON_PATTERN.findall(html):
                try:
                    payload = json.loads(raw.strip())
                except ValueError:
                    continue
                for entry in (payload if isinstance(payload, list) else [payload]):
                    if isinstance(entry, dict):
                        converted = ld_json_to_item(entry)
                        if converted:
                            items.append(converted)
        return items

    def search(self, query: str, city: str, max_results: int) -> Iterator[dict[str, Any]]:
        slug = city_slug(city)
        base = f"https://2gis.ru/{slug}/search/{quote(query)}" if slug \
            else f"https://2gis.ru/search/{quote(query + ' ' + city)}"

        collected = 0
        page = 1
        empty_pages = 0
        while collected < max_results and page <= 30 and empty_pages < 2:
            url = base if page == 1 else f"{base}/page/{page}"
            log.info("GET %s", url)
            html = self.fetch(url)
            if html is None:
                page += 1
                time.sleep(random.uniform(*WEB_DELAY_RANGE))
                continue

            items = self.parse_page(html)
            if not items:
                empty_pages += 1
                log.warning(
                    "Со страницы %s не удалось вытащить ни одной организации. "
                    "Скорее всего карточки рисует JS, а во встроенном JSON их нет — "
                    "именно об этом предупреждение в шапке файла.", page)
            else:
                empty_pages = 0
                for item in items:
                    if collected >= max_results:
                        break
                    collected += 1
                    yield item
                log.info("Страница %s: организаций всего %s", page, collected)

            page += 1
            time.sleep(random.uniform(*WEB_DELAY_RANGE))


def main(argv: Sequence[str] | None = None) -> int:
    setup_logging()
    parser = argparse.ArgumentParser(description="Парсер 2gis.ru — запасной вариант без API.")
    parser.add_argument("--i-understand-the-risks", action="store_true", dest="ack",
                        help="Подтверждение, что риск блокировки IP и нарушения ToS принят")
    parser.add_argument("--city", default=CONFIG["city"])
    parser.add_argument("--category", action="append", dest="categories")
    parser.add_argument("--max", type=int, default=200, dest="max_results")
    parser.add_argument("--out", default="dgis_no_website_web.csv", dest="output_csv")
    args = parser.parse_args(argv)

    print("=" * 78)
    print(" ⚠  ПАРСИНГ 2GIS.RU БЕЗ ОФИЦИАЛЬНОГО API")
    print(" ⚠  Это нарушает пользовательское соглашение сайта и почти наверняка")
    print(" ⚠  закончится 403/капчей/баном вашего IP — включая браузер на этой машине.")
    print(" ⚠  Штатный путь: Catalog API (dgis_venues.py). Если упираетесь в лимиты —")
    print(" ⚠  дробите запросы по районам и рубрикам, а не обходите защиту.")
    print("=" * 78)
    if not args.ack:
        print("\nЗапуск отменён. Осознанно — добавьте флаг --i-understand-the-risks.")
        return 2

    cfg = dict(CONFIG)
    cfg["city"] = args.city
    cfg["categories"] = args.categories or CONFIG["categories"]

    scraper = DgisWebScraper(cfg)
    seen: set[str] = set()
    matched: list[Venue] = []
    total = 0
    exit_code = 0

    for category in cfg["categories"]:
        log.info("─" * 70)
        log.info("Категория: %s (%s)", category, cfg["city"])
        try:
            for item in scraper.search(category, cfg["city"], args.max_results):
                venue = parse_item(item, category, cfg)
                if not venue.name:
                    continue
                key = venue.dedup_key()
                if key in seen:
                    continue
                seen.add(key)
                total += 1
                if passes_filter(venue, cfg):
                    matched.append(venue)
        except Blocked as exc:
            log.error("Остановка: %s", exc)
            exit_code = 1
            break
        except KeyboardInterrupt:
            log.warning("Прервано пользователем.")
            exit_code = 130
            break
        log.info("Категория «%s»: уникальных %s, под фильтр подходит %s",
                 category, total, len(matched))

    log.info("─" * 70)
    log.info("ИТОГО: страниц загружено %s, уникальных организаций %s, без сайта %s",
             scraper.pages_fetched, total, len(matched))
    if total:
        write_csv(matched, args.output_csv)
    else:
        log.error("Не собрано ничего. Это ожидаемый исход для парсинга SPA — "
                  "используйте Catalog API.")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
