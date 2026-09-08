"""Диагностика: какие источники и ключи реально работают.

Каждый сервис проверяется одним дешёвым запросом. Ничего не собирает,
квоту почти не тратит. Запускается через `python main.py --check-keys`.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass

from config import RATE_LIMITS, Config
from utils.http import HttpClient, RateLimit
from utils.logger import get_logger

log = get_logger(__name__)


@dataclass
class ProbeResult:
    service: str
    label: str
    configured: bool
    ok: bool
    detail: str
    hint: str = ""
    required: bool = False

    @property
    def mark(self) -> str:
        if not self.configured:
            return "—"
        return "OK" if self.ok else "ОШИБКА"


async def _probe(name: str, coro) -> tuple[bool, str]:
    try:
        await coro
        return True, "ответил"
    except Exception as exc:  # noqa: BLE001 — нам важен сам факт ошибки
        message = str(exc)
        if len(message) > 110:
            message = message[:107] + "…"
        return False, message or type(exc).__name__


async def run_diagnostics(config: Config) -> list[ProbeResult]:
    creds = config.credentials
    http = HttpClient(default_timeout=15.0, user_agent=creds.osm_user_agent)
    for service, params in RATE_LIMITS.items():
        tuned = dict(params)
        tuned["attempts"] = 1                       # диагностике повторы не нужны
        tuned["timeout"] = min(float(tuned.get("timeout", 20.0)), 25.0)
        http.register(RateLimit(name=service, **tuned))  # type: ignore[arg-type]

    results: list[ProbeResult] = []

    # --- OpenStreetMap: ключ не нужен, поэтому источник обязателен ---
    ok, detail = await _probe(
        "overpass",
        http.post(
            creds.overpass_url,
            service="overpass",
            data={"data": "[out:json][timeout:20];node[amenity=cafe](55.79,49.10,55.80,49.12);out 1;"},
            headers={"User-Agent": creds.osm_user_agent},
        ),
    )
    results.append(ProbeResult(
        "overpass", "OpenStreetMap / Overpass", True, ok, detail,
        hint="сервер перегружен или закрыт сетью — попробуй зеркало "
             "OVERPASS_URL=https://overpass.kumi.systems/api/interpreter",
        required=True,
    ))

    ok, detail = await _probe(
        "nominatim",
        http.get_json(
            f"{creds.nominatim_url.rstrip('/')}/search",
            service="nominatim",
            params={"q": "Казань, Россия", "format": "jsonv2", "limit": 1},
            headers={"User-Agent": creds.osm_user_agent},
        ),
    )
    results.append(ProbeResult(
        "nominatim", "Nominatim (границы городов)", True, ok, detail,
        hint="не критично: без него берётся радиус вокруг центра города",
    ))

    # --- Яндекс ---
    if creds.yandex_places_key:
        ok, detail = await _probe(
            "yandex",
            http.get_json(
                "https://search-maps.yandex.ru/v1/",
                service="yandex",
                params={
                    "apikey": creds.yandex_places_key, "text": "кафе Казань",
                    "lang": "ru_RU", "type": "biz", "results": 1,
                },
            ),
        )
        hint = "проверь, что ключ именно от «Поиска по организациям», и что он активирован"
    else:
        ok, detail, hint = False, "ключ не задан", "YANDEX_PLACES_API_KEY в .env"
    results.append(ProbeResult(
        "yandex", "Яндекс «Поиск по организациям»", bool(creds.yandex_places_key), ok, detail, hint
    ))

    # --- 2ГИС ---
    if creds.dgis_key:
        ok, detail = await _probe(
            "dgis",
            http.get_json(
                "https://catalog.api.2gis.com/3.0/items",
                service="dgis",
                params={
                    "q": "кафе", "point": "49.1064,55.7963", "radius": 3000,
                    "page_size": 1, "key": creds.dgis_key, "locale": "ru_RU",
                },
            ),
        )
        hint = "без него не будет рейтингов и отзывов — фильтры --min-rating/--min-reviews не сработают"
    else:
        ok, detail = False, "ключ не задан"
        hint = "DGIS_API_KEY в .env — даёт рейтинги и число отзывов"
    results.append(ProbeResult("dgis", "2ГИС Catalog API", bool(creds.dgis_key), ok, detail, hint))

    # --- поисковые провайдеры ---
    search_probes = {
        "brave": (
            bool(creds.brave_key),
            lambda: http.get_json(
                "https://api.search.brave.com/res/v1/web/search",
                service="brave",
                params={"q": "кафе Казань официальный сайт", "count": 1},
                headers={"X-Subscription-Token": creds.brave_key, "Accept": "application/json"},
            ),
            "BRAVE_API_KEY — brave.com/search/api, есть бесплатный тариф",
        ),
        "google_cse": (
            bool(creds.google_cse_key and creds.google_cse_cx),
            lambda: http.get_json(
                "https://www.googleapis.com/customsearch/v1",
                service="google_cse",
                params={
                    "key": creds.google_cse_key, "cx": creds.google_cse_cx,
                    "q": "кафе Казань официальный сайт", "num": 1,
                },
            ),
            "нужны обе переменные: GOOGLE_CSE_API_KEY и GOOGLE_CSE_CX",
        ),
        "serpapi": (
            bool(creds.serpapi_key),
            lambda: http.get_json(
                "https://serpapi.com/search.json",
                service="serpapi",
                params={
                    "engine": "google", "q": "кафе Казань официальный сайт",
                    "num": 1, "api_key": creds.serpapi_key,
                },
            ),
            "SERPAPI_KEY — serpapi.com",
        ),
    }
    labels = {
        "brave": "Brave Search API", "google_cse": "Google Programmable Search",
        "serpapi": "SerpApi",
    }
    for name, (configured, call, hint) in search_probes.items():
        if configured:
            ok, detail = await _probe(name, call())
        else:
            ok, detail = False, "ключ не задан"
        results.append(ProbeResult(name, labels[name], configured, ok, detail, hint))

    # --- VK ---
    if creds.vk_token:
        async def vk_call():
            data = await http.get_json(
                "https://api.vk.com/method/groups.getById",
                service="vk",
                params={
                    "group_id": "apiclub", "fields": "site",
                    "access_token": creds.vk_token, "v": creds.vk_api_version,
                },
            )
            if "error" in data:
                raise RuntimeError(data["error"].get("error_msg", "ошибка VK API"))
            return data

        ok, detail = await _probe("vk", vk_call())
        hint = "нужен сервисный ключ доступа приложения, не пользовательский токен"
    else:
        ok, detail = False, "токен не задан"
        hint = "VK_SERVICE_TOKEN — бесплатно на dev.vk.com, поднимает потолок confidence с 78 до 85"
    results.append(ProbeResult("vk", "VK API", bool(creds.vk_token), ok, detail, hint))

    # --- Telegram ---
    ok, detail = await _probe(
        "telegram", http.get_text("https://t.me/telegram", service="telegram")
    )
    results.append(ProbeResult(
        "telegram", "Telegram (публичные страницы)", True, ok, detail,
        hint="не критично: без него не читаются описания каналов",
    ))

    await http.aclose()
    return results


def format_report(results: list[ProbeResult], config: Config) -> str:
    """Собирает человекочитаемый отчёт с выводом, готов ли запуск."""
    lines = ["", "=" * 72, "ПРОВЕРКА ИСТОЧНИКОВ И КЛЮЧЕЙ", "=" * 72]
    width = max(len(r.label) for r in results)
    for result in results:
        lines.append(f"  {result.mark:<8} {result.label:<{width}}  {result.detail}")
        if not result.ok and result.hint:
            lines.append(f"           {' ' * width}  → {result.hint}")

    by_service = {r.service: r for r in results}
    osm_ok = by_service["overpass"].ok
    search_ok = any(by_service[s].ok for s in ("brave", "google_cse", "serpapi"))
    vk_ok = by_service["vk"].ok
    catalog_ok = any(by_service[s].ok for s in ("yandex", "dgis"))

    if search_ok and vk_ok:
        ceiling, verdict = 100, "максимальная надёжность"
    elif vk_ok:
        ceiling, verdict = 85, "основной экспорт работает, но возможны заведения с сайтом"
    elif search_ok:
        ceiling, verdict = 96, "хорошо, но профили VK читаться не будут"
    else:
        ceiling, verdict = 78, "основной экспорт будет ПУСТЫМ"

    lines += ["", "-" * 72, "ИТОГ", "-" * 72]
    if not osm_ok:
        lines.append("  Базовый источник OpenStreetMap недоступен — собирать нечего.")
        lines.append("  Проверь интернет и попробуй зеркало Overpass (см. подсказку выше).")
    else:
        lines.append(f"  Достижимый максимум website_confidence: {ceiling} — {verdict}")
        lines.append(f"  Текущий порог экспорта (--min-confidence): {config.min_confidence}")
        if ceiling < config.min_confidence:
            lines.append("")
            lines.append("  ВНИМАНИЕ: потолок ниже порога — в файл не попадёт ни одна запись.")
            lines.append("  Заведи VK_SERVICE_TOKEN (бесплатно) либо снизь --min-confidence.")
        if not catalog_ok:
            lines.append("")
            lines.append("  Рейтингов и отзывов не будет (нет ключей Яндекса и 2ГИС):")
            lines.append("  фильтры --min-rating и --min-reviews отсекут всё, не используй их.")
    lines.append("=" * 72)
    return "\n".join(lines)


def check_keys(config: Config) -> int:
    """Точка входа для CLI. Возвращает код выхода."""
    results = asyncio.run(run_diagnostics(config))
    print(format_report(results, config))
    overpass = next(r for r in results if r.service == "overpass")
    return 0 if overpass.ok else 1
