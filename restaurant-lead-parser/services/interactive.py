"""Интерактивный режим: спросил город и нишу — получил лидов с контактами.

Запускается как `python main.py` без аргументов или `python main.py -i`.
"""
from __future__ import annotations

import asyncio
from pathlib import Path

from config import Config
from database.models import NO_WEBSITE_HIGH_CONFIDENCE, NO_WEBSITE_MEDIUM_CONFIDENCE, Place
from database.repository import Repository
from exporters.csv_exporter import export_csv
from exporters.excel_exporter import export_excel
from services.pipeline import Pipeline
from sources.niches import resolve_niche, suggest_niches
from utils.cities import find_city, resolve_scope
from utils.logger import get_logger

log = get_logger(__name__)

_RULE = "─" * 72


def _ask(prompt: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    try:
        answer = input(f"{prompt}{suffix}: ").strip()
    except EOFError:
        return default
    return answer or default


def _ask_int(prompt: str, default: int) -> int:
    while True:
        raw = _ask(prompt, str(default))
        try:
            value = int(raw)
            if value > 0:
                return value
        except ValueError:
            pass
        print("  Нужно положительное число.")


def ask_city() -> str:
    """Спрашивает город, пока не найдётся в справочнике."""
    while True:
        answer = _ask("Город", "Казань")
        if find_city(answer):
            return answer
        print(f"  «{answer}» не найден в справочнике.")
        print("  Полный список:  python main.py --list-cities")
        print("  Либо добавь город в data/russian_cities.json")


def ask_niche() -> str:
    print("\nКакой бизнес ищем? Примеры:")
    titles = [n.title for n in suggest_niches()]
    for index in range(0, len(titles), 3):
        print("  " + " · ".join(f"{t}" for t in titles[index:index + 3]))
    print("  (можно вписать что угодно своими словами; Enter — весь общепит)")
    return _ask("\nНиша", "")


def format_lead(place: Place, index: int) -> str:
    """Одна карточка лида для терминала — то, с чем идут звонить."""
    contacts: list[str] = []
    if place.phone:
        contacts.append(f"тел. {place.phone}")
    if place.email:
        contacts.append(place.email)
    if place.vk_url:
        contacts.append(f"VK {place.vk_url}")
    if place.telegram_url:
        contacts.append(f"TG {place.telegram_url}")
    if place.instagram_url:
        contacts.append(f"IG {place.instagram_url}")

    quality = []
    if place.rating:
        quality.append(f"рейтинг {place.rating}")
    if place.reviews_count:
        quality.append(f"{place.reviews_count} отз.")
    if place.is_chain:
        quality.append("сеть")

    lines = [
        f"{index:>3}. {place.name}   "
        f"[lead {place.lead_score} · нет сайта на {place.website_confidence}%]",
    ]
    if place.full_address:
        lines.append(f"     {place.full_address}")
    if contacts:
        lines.append("     " + "  |  ".join(contacts))
    if quality:
        lines.append("     " + ", ".join(quality))
    if place.source_url:
        lines.append(f"     карточка: {place.source_url}")
    return "\n".join(lines)


def print_leads(leads: list[Place], shown: int = 15) -> None:
    if not leads:
        return
    print(f"\n{_RULE}\nЛИДЫ (сверху — самые перспективные)\n{_RULE}")
    for index, place in enumerate(leads[:shown], start=1):
        print(format_lead(place, index))
        print()
    if len(leads) > shown:
        print(f"  …и ещё {len(leads) - shown} в файле.\n")


def run_interactive(base_config: Config) -> int:
    print(f"\n{_RULE}")
    print("ПОИСК ЛИДОВ: бизнесы без собственного сайта")
    print(_RULE)

    city_name = ask_city()
    niche_query = ask_niche()
    niche = resolve_niche(niche_query)
    limit = _ask_int("\nСколько компаний обойти", 400)

    from services.confidence import achievable_ceiling

    config = base_config
    ceiling, parts = achievable_ceiling(config)
    if ceiling < config.min_confidence:
        lowered = max(70, ceiling)
        print(f"\n  Порог confidence снижен: {config.min_confidence} -> {lowered}")
        print(f"  При текущих ключах максимум {ceiling} ({parts}).")
        print("  Часть компаний в списке может оказаться с сайтом — проверяй перед звонком.")
        print("  Строгий отбор вернёт бесплатный VK_SERVICE_TOKEN + ключ Brave Search.")
        config.min_confidence = lowered

    config.cities = [city_name]
    config.niche_query = niche_query
    config.limit = limit
    config.progress_bar = True

    if niche.custom:
        print(f"\n  Ниша «{niche.title}» не из готового списка — ищу по названию")
        print("  в OpenStreetMap и полнотекстом в каталогах. Результатов может быть меньше.")

    print(f"\n  Город:  {city_name}")
    print(f"  Ниша:   {niche.title}")
    print(f"  Лимит:  {limit}")
    print(f"\n  Это займёт от нескольких минут до часа. Прервать — Ctrl+C,")
    print(f"  прогресс сохранится, повторный запуск продолжит с того же места.\n")

    repo = Repository(config.db_path)
    pipeline = Pipeline(config, repo)
    exit_code = 0
    try:
        cities = resolve_scope(cities=[city_name])
        stats = asyncio.run(pipeline.run(cities))
        if stats.every_source_failed():
            print("\n  Ни один источник не ответил — собирать было нечего.")
            print("  Проверь: python main.py --check-keys")
            exit_code = 3
    except KeyboardInterrupt:
        print("\n  Прервано. Запусти снова — продолжит с сохранённого места.")
        exit_code = 130
    finally:
        asyncio.run(pipeline.aclose())

    leads = [
        p for p in repo.list_places(city=city_name)
        if p.website_status in (NO_WEBSITE_HIGH_CONFIDENCE, NO_WEBSITE_MEDIUM_CONFIDENCE)
        and p.website_confidence >= config.min_confidence
    ]
    leads.sort(key=lambda p: (-p.lead_score, -p.website_confidence, -(p.reviews_count or 0)))

    print_leads(leads)

    slug = f"{city_name}_{niche.key}".replace(" ", "_")
    xlsx = Path(config.output_dir) / f"leads_{slug}.xlsx"
    csv = xlsx.with_suffix(".csv")
    everything = repo.list_places(city=city_name, include_excluded=True)
    export_excel(everything, xlsx)
    export_csv(leads, csv)
    repo.close()

    print(_RULE)
    print(f"  Найдено лидов: {len(leads)}")
    if not leads and exit_code == 0:
        print("  Ноль — почти всегда значит, что не хватает ключей.")
        print("  Проверь потолок confidence:  python main.py --check-keys")
    print(f"  Excel: {xlsx}")
    print(f"  CSV:   {csv}")
    print(_RULE + "\n")
    return exit_code
