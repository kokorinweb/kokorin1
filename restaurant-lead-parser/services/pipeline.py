"""Конвейер: сбор -> нормализация -> дедупликация -> проверки -> оценки -> база."""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from tqdm import tqdm

from config import Config, RATE_LIMITS
from database.models import (
    CHECK_FAILED, HAS_WEBSITE, NO_WEBSITE_HIGH_CONFIDENCE, NO_WEBSITE_MEDIUM_CONFIDENCE,
    NOT_CHECKED, Place, utcnow_iso,
)
from database.repository import Repository
from services.chain_detector import annotate_chains
from services.confidence import ConfidenceInput, compute_confidence
from services.deduplicator import deduplicate, place_key
from services.domain_classifier import (
    MULTILINK, OFFICIAL_WEBSITE, classify_url, social_network_of,
)
from services.lead_scorer import apply_lead_scores
from services.search_checker import SearchChecker, candidate_domains
from services.social_checker import SocialChecker
from services.website_checker import WebsiteChecker
from sources.base import BaseSource, RawPlace, SourceUnavailable
from sources.categories import category_label, exclusion_reason, map_category
from sources.registry import build_sources
from utils.cities import City
from utils.http import HttpClient, RateLimit, ServiceBlocked
from utils.logger import get_logger
from utils.normalization import (
    normalize_address, normalize_business_name, normalize_domain, normalize_phones, normalize_url,
)

log = get_logger(__name__)


@dataclass
class CityStats:
    city: str
    found: int = 0
    after_dedup: int = 0
    excluded: int = 0
    checked: int = 0
    from_cache: int = 0
    has_website: int = 0
    high_confidence: int = 0
    medium_confidence: int = 0
    failed: int = 0
    quality_leads: int = 0
    errors: list[str] = field(default_factory=list)


@dataclass
class RunStats:
    cities: list[CityStats] = field(default_factory=list)
    #: (источник, город, причина) для источников, упавших целиком
    source_failures: list[tuple[str, str, str]] = field(default_factory=list)

    def every_source_failed(self) -> bool:
        """True, если ничего не собрано и виноваты именно источники, а не фильтры."""
        return bool(self.source_failures) and self.totals()["found"] == 0

    def totals(self) -> dict[str, int]:
        keys = (
            "found", "after_dedup", "excluded", "checked", "has_website",
            "high_confidence", "medium_confidence", "failed", "quality_leads",
        )
        return {key: sum(getattr(c, key) for c in self.cities) for key in keys}


# ---------------------------------------------------------------------------
# Нормализация RawPlace -> Place
# ---------------------------------------------------------------------------


def raw_to_place(raw: RawPlace, niche=None) -> Place | None:
    """Приводит сырую запись к модели. None — если запись отбраковали."""
    from sources.niches import FOOD_NICHE, niche_category

    niche = niche or FOOD_NICHE
    reason = exclusion_reason(
        name=raw.name, raw_category=raw.raw_category, tags=raw.tags,
        address=raw.address, food=niche.food,
    )
    if reason:
        log.debug("отброшено «%s»: %s", raw.name, reason)
        return None

    website = normalize_url(raw.website) or ""
    website_class = classify_url(website) if website else None

    vk_url = tg_url = ig_url = ""
    other: list[str] = []
    booking = normalize_url(raw.booking_url) or ""
    delivery = normalize_url(raw.delivery_url) or ""

    social_pool = list(raw.social_urls)
    if website_class and website_class.type != OFFICIAL_WEBSITE:
        # в поле «сайт» источника лежит соцсеть/агрегатор — это не сайт
        social_pool.append(website)
        if website_class.type == "DELIVERY":
            delivery = delivery or website
        elif website_class.type == "BOOKING":
            booking = booking or website
        website = ""

    for url in social_pool:
        url = normalize_url(url) or ""
        if not url:
            continue
        network = social_network_of(url)
        if network == "vk" and not vk_url:
            vk_url = url
        elif network == "telegram" and not tg_url:
            tg_url = url
        elif network == "instagram" and not ig_url:
            ig_url = url
        elif url not in other:
            other.append(url)

    phones = normalize_phones(raw.phones)
    category = niche_category(niche, raw.raw_category, raw.name)

    place = Place(
        name=raw.name.strip(),
        normalized_name=normalize_business_name(raw.name),
        category=category,
        raw_category=raw.raw_category,
        city=raw.city or "",
        region=raw.region or "",
        full_address=raw.address or "",
        normalized_address=normalize_address(raw.address),
        latitude=raw.latitude,
        longitude=raw.longitude,
        phone="; ".join(phones),
        email=raw.email or "",
        working_hours=raw.working_hours or "",
        rating=raw.rating,
        reviews_count=raw.reviews_count,
        price_level=raw.price_level,
        source=raw.source,
        sources=[raw.source],
        source_url=raw.source_url,
        source_ids=[f"{raw.source}:{raw.source_id}"],
        website_from_source=website,
        vk_url=vk_url,
        telegram_url=tg_url,
        instagram_url=ig_url,
        other_socials=other,
        booking_url=booking,
        delivery_url=delivery,
        detected_domains=[d for d in [normalize_domain(website)] if d],
        website_status=NOT_CHECKED,
    )
    if raw.brand_id:
        place.evidence["brand_id"] = raw.brand_id
    if raw.brand:
        place.evidence["brand"] = raw.brand
    place.place_key = place_key(place)
    return place


# ---------------------------------------------------------------------------
# Конвейер
# ---------------------------------------------------------------------------


class Pipeline:
    def __init__(self, config: Config, repo: Repository) -> None:
        self.config = config
        self.repo = repo
        self.http = HttpClient(
            default_timeout=config.http_timeout,
            user_agent=config.credentials.osm_user_agent,
        )
        for name, params in RATE_LIMITS.items():
            self.http.register(RateLimit(name=name, **params))  # type: ignore[arg-type]

        self.sources: list[BaseSource] = build_sources(config, self.http)
        self.search = SearchChecker(config, self.http, repo)
        self.social = SocialChecker(config, self.http, repo)
        self.website = WebsiteChecker(config, self.http, repo)
        self.stats = RunStats()

    async def aclose(self) -> None:
        await self.http.aclose()

    # -- 1. сбор ------------------------------------------------------------

    async def harvest_city(self, city: City, limit: int) -> tuple[list[Place], int]:
        raw_places: list[RawPlace] = []
        for source in self.sources:
            if self.config.resume and self.repo.progress_status(source.name, city.name) == "done":
                log.info("[%s] источник %s уже обработан ранее — пропуск", city.name, source.name)
                continue
            try:
                found = await source.fetch_city(city, self.config.categories, limit)
            except SourceUnavailable as exc:
                log.info("[%s] %s недоступен: %s", city.name, source.name, exc)
                self.stats.source_failures.append((source.name, city.name, str(exc)))
                continue
            except ServiceBlocked as exc:
                log.warning("[%s] %s заблокирован: %s", city.name, source.name, exc)
                self.stats.source_failures.append((source.name, city.name, str(exc)))
                self.repo.mark_progress(source.name, city.name, "blocked", region=city.region, error=str(exc))
                continue
            except Exception as exc:  # noqa: BLE001 — один упавший источник не валит прогон
                log.error("[%s] %s: ошибка сбора: %s", city.name, source.name, exc)
                self.stats.source_failures.append((source.name, city.name, str(exc)))
                self.repo.mark_progress(source.name, city.name, "error", region=city.region, error=str(exc))
                continue

            log.info("[%s] %s: получено %d записей", city.name, source.name, len(found))
            raw_places.extend(found)
            self.repo.mark_progress(
                source.name, city.name, "done", region=city.region, found=len(found)
            )

        places: list[Place] = []
        excluded = 0
        niche = self.config.niche
        for raw in raw_places:
            place = raw_to_place(raw, niche)
            if place is None:
                excluded += 1
                continue
            place.city = place.city or city.name
            place.region = place.region or city.region
            places.append(place)
        return places, excluded

    # -- 2. проверка сайта --------------------------------------------------

    def _needs_check(self, place: Place) -> bool:
        if self.config.refresh or not place.last_checked_at:
            return True
        try:
            checked = datetime.fromisoformat(place.last_checked_at)
        except ValueError:
            return True
        if checked.tzinfo is None:
            checked = checked.replace(tzinfo=timezone.utc)
        age = datetime.now(timezone.utc) - checked
        return age > timedelta(days=self.config.recheck_after_days)

    async def check_place(self, place: Place) -> Place:
        """Проверки №1–№4 и расчёт confidence для одного заведения."""
        data = ConfidenceInput()
        evidence: dict = place.evidence or {}
        candidates: list[str] = []
        verified = None
        verified_source = ""

        # --- проверка №1: карточка источника ---
        if place.website_from_source:
            info = classify_url(place.website_from_source)
            data.catalog_website = place.website_from_source
            if info.type == OFFICIAL_WEBSITE and info.domain:
                data.catalog_website_is_own_domain = True
                check = await self.website.check_domain(
                    info.domain, name=place.name, phones=place.phones,
                    city=place.city, address=place.full_address,
                )
                evidence["catalog_domain_check"] = check.to_dict()
                if check.verified:
                    verified, verified_source = check, "карточка источника"
                elif not check.reachable or check.is_parked:
                    data.catalog_domain_dead = True
                else:
                    # домен жив, но не подтвердился — всё равно считаем сайтом из карточки
                    verified, verified_source = check, "карточка источника (без строгого подтверждения)"

        # --- проверка №2: поиск ---
        search_socials: list[str] = []
        if verified is None and self.search.enabled:
            try:
                outcome = await self.search.check(
                    name=place.name, city=place.city,
                    category_label=category_label(place.category),
                )
            except ServiceBlocked as exc:
                outcome = None
                data.check_failed = True
                data.failure_reason = str(exc)
            if outcome is not None:
                data.search_performed = outcome.performed
                data.search_hits = len(outcome.hits)
                data.search_found_own_domain = bool(outcome.candidate_domains)
                data.search_only_platforms = outcome.only_platforms
                candidates.extend(outcome.candidate_domains)
                search_socials = outcome.social_urls
                evidence["search"] = {
                    "provider": outcome.provider,
                    "queries": outcome.queries,
                    "hits": [
                        {"url": h.url, "type": h.url_type, "title": h.title[:120]}
                        for h in outcome.hits[:10]
                    ],
                }

        # --- проверка №3: соцсети ---
        if self.config.socials_enabled():
            social_outcome = await self.social.check(
                name=place.name, city=place.city,
                social_urls=place.social_urls(), search_socials=search_socials,
            )
            data.social_checked = social_outcome.performed
            data.social_profiles_found = social_outcome.profiles_found
            data.social_profiles_inspected = social_outcome.profiles_inspected
            data.social_site_links = len(social_outcome.site_candidates)
            candidates.extend(
                normalize_domain(u) or "" for u in social_outcome.site_candidates
            )
            evidence["social"] = social_outcome.to_dict()
            if social_outcome.total_followers:
                evidence["social_followers"] = social_outcome.total_followers
            for profile in social_outcome.profiles:
                if profile.network == "vk" and not place.vk_url:
                    place.vk_url = profile.url
                elif profile.network == "telegram" and not place.telegram_url:
                    place.telegram_url = profile.url

        # --- проверка №4: перебор вероятных доменов ---
        if verified is None and self.config.use_domain_probe:
            probe = candidate_domains(
                place.name, place.city, self.config.domain_probe_max_candidates
            )
            probe = [d for d in probe if d not in candidates]
            if probe:
                data.probe_performed = True
                candidates.extend(probe)

        # --- собственно проверка кандидатов ---
        candidates = [c for c in dict.fromkeys(candidates) if c]
        if verified is None and candidates:
            try:
                web_evidence = await self.website.check_domains(
                    candidates, name=place.name, phones=place.phones,
                    city=place.city, address=place.full_address,
                )
            except ServiceBlocked as exc:
                web_evidence = None
                data.check_failed = True
                data.failure_reason = str(exc)
            if web_evidence is not None:
                data.domains_checked = len(web_evidence.checks)
                evidence["domain_checks"] = [c.to_dict() for c in web_evidence.checks[:10]]
                if web_evidence.verified:
                    verified = web_evidence.verified
                    verified_source = "поиск/соцсети/перебор доменов"

        for domain in candidates:
            if domain not in place.detected_domains:
                place.detected_domains.append(domain)

        if verified is not None:
            data.verified_domain = verified.final_domain or verified.domain
            data.verified_source = verified_source
            data.verified_reason = verified.reason
            place.official_website = verified.final_url or verified.url

        result = compute_confidence(data)
        place.website_status = result.status
        place.website_confidence = result.confidence
        place.website_check_reason = result.reason
        place.last_checked_at = utcnow_iso()
        evidence["confidence_breakdown"] = result.breakdown
        place.evidence = evidence
        return place

    async def check_places(self, places: list[Place], city_name: str) -> CityStats:
        stats = CityStats(city=city_name)
        stats.after_dedup = len(places)

        to_check = [p for p in places if self._needs_check(p)]
        stats.from_cache = len(places) - len(to_check)

        semaphore = asyncio.Semaphore(8)
        progress = tqdm(
            total=len(to_check),
            desc=f"[{city_name}] проверка сайтов",
            unit="зав.",
            disable=not self.config.progress_bar or not to_check,
            leave=False,
        )

        async def worker(place: Place) -> None:
            async with semaphore:
                try:
                    await self.check_place(place)
                except Exception as exc:  # noqa: BLE001 — одна ошибка не валит город
                    place.website_status = CHECK_FAILED
                    place.website_confidence = 0
                    place.website_check_reason = f"ошибка проверки: {exc}"
                    place.last_checked_at = utcnow_iso()
                    log.debug("проверка «%s» не удалась: %s", place.name, exc)
                finally:
                    progress.update(1)
                    if progress.n % 25 == 0:
                        self.repo.upsert_places([place])

        await asyncio.gather(*(worker(p) for p in to_check))
        progress.close()

        stats.checked = len(to_check)
        for place in places:
            if place.website_status == HAS_WEBSITE:
                stats.has_website += 1
            elif place.website_status == NO_WEBSITE_HIGH_CONFIDENCE:
                stats.high_confidence += 1
            elif place.website_status == NO_WEBSITE_MEDIUM_CONFIDENCE:
                stats.medium_confidence += 1
            elif place.website_status == CHECK_FAILED:
                stats.failed += 1
        return stats

    # -- 3. фильтр качества -------------------------------------------------

    def passes_filters(self, place: Place) -> bool:
        cfg = self.config
        if cfg.min_rating and (place.rating or 0) < cfg.min_rating:
            return False
        if cfg.min_reviews and (place.reviews_count or 0) < cfg.min_reviews:
            return False
        if cfg.exclude_chains and place.is_chain:
            return False
        if place.website_confidence < cfg.min_confidence:
            return False
        if place.lead_score < cfg.min_lead_score:
            return False
        return True

    # -- 4. город целиком ---------------------------------------------------

    async def run_city(self, city: City, limit: int) -> CityStats:
        log.info("=" * 60)
        log.info("Город: %s (%s)", city.name, city.region)

        harvested, excluded = await self.harvest_city(city, limit)
        print(f"[{city.name}] Найдено заведений: {len(harvested)}")

        known = {p.place_key: p for p in self.repo.iter_places(city=city.name)}
        for place in harvested:
            existing = known.get(place.place_key)
            if existing is not None:
                place.website_status = existing.website_status
                place.website_confidence = existing.website_confidence
                place.website_check_reason = existing.website_check_reason
                place.official_website = existing.official_website
                place.last_checked_at = existing.last_checked_at
                place.first_seen_at = existing.first_seen_at
                place.evidence = {**existing.evidence, **place.evidence}

        priorities = {s.name: s.priority for s in self.sources}
        unique, merged = deduplicate(harvested, priorities=priorities)
        print(f"[{city.name}] После дедупликации: {len(unique)} (слито дублей: {merged})")

        annotate_chains(unique, threshold=self.config.chain_branch_threshold)

        if limit and len(unique) > limit:
            unique = unique[:limit]

        if self.config.check_websites:
            stats = await self.check_places(unique, city.name)
        else:
            stats = CityStats(city=city.name, after_dedup=len(unique))
        stats.found = len(harvested)
        stats.excluded = excluded

        apply_lead_scores(unique, exclude_chains=self.config.exclude_chains)
        self.repo.upsert_places(unique)

        stats.quality_leads = sum(1 for p in unique if self.passes_filters(p))
        print(f"[{city.name}] Проверено сайтов: {stats.checked} / {stats.after_dedup}"
              + (f" (из кэша: {stats.from_cache})" if stats.from_cache else ""))
        print(f"[{city.name}] Без сайта high confidence: {stats.high_confidence}")
        print(f"[{city.name}] Качественных лидов: {stats.quality_leads}")
        self.stats.cities.append(stats)
        return stats

    async def run(self, cities: list[City]) -> RunStats:
        if not self.sources:
            raise RuntimeError(
                "Не сконфигурирован ни один источник. Проверь .env и параметр --sources."
            )
        log.info(
            "Источники: %s | поиск: %s | соцсети: %s",
            ", ".join(s.name for s in self.sources),
            ", ".join(self.search.provider_names()) or "выключен",
            "VK API" if self.social.vk_enabled else "только публичные ссылки",
        )

        remaining = self.config.limit
        for city in cities:
            if remaining is not None and remaining <= 0:
                log.info("Достигнут общий лимит --limit, остановка обхода")
                break
            per_city = self.config.per_city_limit or remaining or 0
            stats = await self.run_city(city, per_city)
            if remaining:
                remaining -= stats.after_dedup
        return self.stats
