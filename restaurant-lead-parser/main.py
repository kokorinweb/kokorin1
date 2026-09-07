#!/usr/bin/env python3
"""restaurant-lead-parser — поиск заведений общепита без собственного сайта.

Примеры:
    python main.py --city "Казань" --limit 500
    python main.py --region "Краснодарский край" --limit 1000
    python main.py --country RU --limit 10000
    python main.py --city "Москва" --categories restaurant,cafe,gastropub \\
        --min-rating 4.2 --min-reviews 30 --min-confidence 85 --min-lead-score 60 \\
        --exclude-chains --limit 1000 --output leads.xlsx
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import CATEGORIES, Config, parse_categories  # noqa: E402
from database.models import (  # noqa: E402
    HAS_WEBSITE, NO_WEBSITE_HIGH_CONFIDENCE, NO_WEBSITE_MEDIUM_CONFIDENCE, Place,
)
from database.repository import Repository  # noqa: E402
from exporters.csv_exporter import export_csv  # noqa: E402
from exporters.excel_exporter import export_excel  # noqa: E402
from services.pipeline import Pipeline  # noqa: E402
from sources.registry import available_source_names  # noqa: E402
from utils.cities import all_cities, known_regions, resolve_scope  # noqa: E402
from utils.logger import get_logger, setup_logging  # noqa: E402

log = get_logger("main")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="main.py",
        description="Сбор заведений общепита России и проверка отсутствия собственного сайта",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    scope = parser.add_argument_group("область обхода")
    scope.add_argument("--city", action="append", default=[],
                       help="город (можно указать несколько раз или через запятую)")
    scope.add_argument("--region", default="", help='регион, например "Краснодарский край"')
    scope.add_argument("--country", default="", help="RU — обойти все города из справочника")

    filters = parser.add_argument_group("фильтры лидов")
    filters.add_argument("--categories", default=None,
                         help=f"через запятую: {', '.join(CATEGORIES)} или all")
    filters.add_argument("--limit", type=int, default=500, help="максимум заведений за прогон")
    filters.add_argument("--per-city-limit", type=int, default=0, help="лимит на один город")
    filters.add_argument("--min-rating", type=float, default=0.0)
    filters.add_argument("--min-reviews", type=int, default=0)
    filters.add_argument("--min-confidence", type=int, default=85,
                         help="порог website_confidence для основного экспорта (по умолчанию 85)")
    filters.add_argument("--min-lead-score", type=int, default=0)
    filters.add_argument("--exclude-chains", action="store_true",
                         help="исключить крупные федеральные сети")
    filters.add_argument("--top", type=int, default=0,
                         help="выгрузить только top-N лидов (100 / 500 / 1000)")

    checks = parser.add_argument_group("проверки")
    checks.add_argument("--sources", default=",".join(["osm", "yandex", "dgis"]),
                        help=f"источники через запятую: {', '.join(available_source_names())}")
    checks.add_argument("--no-search", action="store_true", help="не использовать поисковый API")
    checks.add_argument("--no-socials", action="store_true", help="не проверять соцсети")
    checks.add_argument("--no-domain-probe", action="store_true",
                        help="не проверять вероятные домены по названию")
    checks.add_argument("--no-website-check", action="store_true",
                        help="только собрать данные, без проверки сайтов")
    checks.add_argument("--refresh", action="store_true", help="игнорировать кэш и перепроверить всё")

    output = parser.add_argument_group("вывод")
    output.add_argument("--output", default="output/restaurants_no_website.xlsx",
                        help="путь к XLSX (рядом создаётся одноимённый CSV)")
    output.add_argument("--db", default=None, help="путь к SQLite (по умолчанию из .env)")
    output.add_argument("--resume", action="store_true",
                        help="продолжить прерванный обход, не собирая заново")
    output.add_argument("--reset-progress", action="store_true", help="сбросить прогресс обхода")
    output.add_argument("--export-only", action="store_true",
                        help="ничего не собирать, только выгрузить из базы")
    output.add_argument("--log-level", default=None, choices=["DEBUG", "INFO", "WARNING", "ERROR"])
    output.add_argument("--no-progress", action="store_true", help="без прогресс-бара")

    info = parser.add_argument_group("справка")
    info.add_argument("--list-cities", action="store_true", help="показать города справочника")
    info.add_argument("--list-regions", action="store_true", help="показать регионы")
    info.add_argument("--list-categories", action="store_true", help="показать категории")

    return parser


def expand_cities(values: list[str]) -> list[str]:
    result: list[str] = []
    for value in values:
        result.extend(part.strip() for part in value.split(",") if part.strip())
    return result


def config_from_args(args: argparse.Namespace) -> Config:
    config = Config()
    config.cities = expand_cities(args.city)
    config.region = args.region
    config.country = args.country
    config.categories = parse_categories(args.categories)
    config.limit = args.limit
    config.per_city_limit = args.per_city_limit
    config.min_rating = args.min_rating
    config.min_reviews = args.min_reviews
    config.min_confidence = args.min_confidence
    config.min_lead_score = args.min_lead_score
    config.exclude_chains = args.exclude_chains
    config.sources = [s.strip() for s in args.sources.split(",") if s.strip()]
    config.use_search = not args.no_search
    config.use_socials = not args.no_socials
    config.use_domain_probe = not args.no_domain_probe
    config.check_websites = not args.no_website_check
    config.refresh = args.refresh
    config.output = args.output
    config.resume = args.resume
    config.progress_bar = not args.no_progress
    if args.db:
        config.db_path = args.db
    if args.log_level:
        config.log_level = args.log_level
    return config


def warn_about_sources(config: Config) -> None:
    creds = config.credentials
    if not creds.has_search_provider() and config.use_search:
        print(
            "\n⚠  Поисковый API не настроен (BRAVE_API_KEY / GOOGLE_CSE_* / SERPAPI_KEY).\n"
            "   Проверка №2 выполняться не будет. Максимальный website_confidence — 85,\n"
            "   то есть выборка будет менее надёжной. См. README, раздел «API-ключи».\n"
        )
    if not creds.yandex_places_key and not creds.dgis_key:
        print(
            "ℹ  Работает только источник OpenStreetMap. Он бесплатный и покрывает всю Россию,\n"
            "   но не содержит рейтингов и отзывов — фильтры --min-rating/--min-reviews\n"
            "   отсеют почти всё. Для рейтингов подключи YANDEX_PLACES_API_KEY или DGIS_API_KEY.\n"
        )
    if not creds.vk_token and config.use_socials:
        print(
            "ℹ  VK_SERVICE_TOKEN не задан: ссылки на сайт из профилей VK проверяться не будут.\n"
        )


def select_for_export(repo: Repository, config: Config, top: int) -> tuple[list[Place], list[Place]]:
    """(все записи для книги, отфильтрованные лиды «без сайта»)."""
    everything = repo.list_places(include_excluded=True)
    leads = [
        p for p in everything
        if p.website_confidence >= config.min_confidence
        and p.lead_score >= config.min_lead_score
        and (not config.exclude_chains or not p.is_chain)
        and (not config.min_rating or (p.rating or 0) >= config.min_rating)
        and (not config.min_reviews or (p.reviews_count or 0) >= config.min_reviews)
    ]
    leads.sort(key=lambda p: (-p.lead_score, -p.website_confidence, -(p.reviews_count or 0)))
    if top:
        leads = leads[:top]
    return everything, leads


def print_summary(everything: list[Place], leads: list[Place], config: Config) -> None:
    high = sum(1 for p in everything if p.website_status == NO_WEBSITE_HIGH_CONFIDENCE)
    medium = sum(1 for p in everything if p.website_status == NO_WEBSITE_MEDIUM_CONFIDENCE)
    has = sum(1 for p in everything if p.website_status == HAS_WEBSITE)
    print("\n" + "=" * 62)
    print("ИТОГО")
    print(f"  Заведений в базе:            {len(everything)}")
    print(f"  Сайт найден и подтверждён:   {has}")
    print(f"  Без сайта (high confidence): {high}")
    print(f"  Требует проверки (medium):   {medium}")
    print(f"  Лидов после фильтров:        {len(leads)}"
          f" (confidence ≥ {config.min_confidence}, lead_score ≥ {config.min_lead_score})")
    if leads:
        print("\n  Топ-5 лидов:")
        for place in leads[:5]:
            print(
                f"    {place.lead_score:3d} | conf {place.website_confidence:3d} | "
                f"{place.name[:38]:<38} | {place.city}"
            )
    print("=" * 62)


async def run(args: argparse.Namespace) -> int:
    config = config_from_args(args)
    setup_logging(config.log_level)

    if not args.export_only:
        try:
            cities = resolve_scope(
                cities=config.cities, region=config.region, country=config.country
            )
        except ValueError as exc:
            print(f"Ошибка: {exc}", file=sys.stderr)
            return 2
        if not cities:
            print("Не задана область обхода: укажи --city, --region или --country RU",
                  file=sys.stderr)
            return 2
    else:
        cities = []

    repo = Repository(config.db_path)
    if args.reset_progress:
        removed = repo.reset_progress()
        log.info("Прогресс сброшен (%d записей)", removed)

    exit_code = 0
    if not args.export_only:
        warn_about_sources(config)
        log.info(
            "Область: %s | городов: %d | категорий: %d | лимит: %d",
            config.scope_label, len(cities), len(config.categories), config.limit,
        )
        run_id = repo.start_run(config.scope_label, vars(args))
        pipeline = Pipeline(config, repo)
        try:
            stats = await pipeline.run(cities)
            repo.finish_run(run_id, stats.totals())
        except KeyboardInterrupt:
            print("\nПрервано пользователем. Прогресс сохранён — запусти с --resume.")
            exit_code = 130
        except RuntimeError as exc:
            print(f"Ошибка: {exc}", file=sys.stderr)
            exit_code = 1
        finally:
            await pipeline.aclose()
        if pipeline.http.stats:
            log.info("Статистика HTTP: %s", pipeline.http.stats)

    everything, leads = select_for_export(repo, config, args.top)
    xlsx_path = Path(config.output)
    csv_path = xlsx_path.with_name(
        xlsx_path.stem.replace(".xlsx", "") + ".csv"
    ) if xlsx_path.suffix == ".xlsx" else Path(str(xlsx_path) + ".csv")

    export_excel(everything, xlsx_path, top=args.top or None)
    export_csv(leads, csv_path)

    print_summary(everything, leads, config)
    print(f"\nФайлы:\n  {xlsx_path}\n  {csv_path}\n  база: {config.db_path}")
    repo.close()
    return exit_code


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.list_categories or args.list_regions or args.list_cities:
        try:
            if args.list_categories:
                for key, (label, default_on) in CATEGORIES.items():
                    print(f"  {key:<18} {label}{'  (вкл. по умолчанию)' if default_on else ''}")
            if args.list_regions:
                for region in known_regions():
                    print(f"  {region}")
            if args.list_cities:
                for city in all_cities():
                    line = f"  {city.name:<26} {city.region:<38} {city.population:>9,}"
                    print(line.replace(",", " "))
            sys.stdout.flush()
        except BrokenPipeError:  # вывод ушёл в head/less
            os.dup2(os.open(os.devnull, os.O_WRONLY), sys.stdout.fileno())
        return 0

    if not (args.city or args.region or args.country or args.export_only):
        parser.print_help()
        return 2

    try:
        return asyncio.run(run(args))
    except KeyboardInterrupt:
        print("\nПрервано.")
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
