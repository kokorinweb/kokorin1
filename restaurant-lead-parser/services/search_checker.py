"""Проверка №2: поиск официального сайта заведения через разрешённые API.

Поддерживаются Brave Search API, Google Programmable Search (CSE) и SerpApi.
HTML-выдача поисковиков НЕ парсится: это нарушает их правила и упирается в
антибот-защиту, которую мы принципиально не обходим.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from typing import Any

from config import Config
from database.repository import Repository
from services.domain_classifier import (
    DIRECTORY, MAPS, MULTILINK, OFFICIAL_WEBSITE, SOCIAL_NETWORK, classify_url,
)
from utils.http import HttpClient, ServiceBlocked
from utils.logger import get_logger
from utils.normalization import normalize_domain, normalize_url, slugify, slugify_dashed

log = get_logger(__name__)


@dataclass
class SearchHit:
    url: str
    title: str
    snippet: str
    provider: str
    url_type: str = ""
    domain: str | None = None


@dataclass
class SearchOutcome:
    """Результат проверки №2 по одному заведению."""

    performed: bool = False
    provider: str = ""
    queries: list[str] = field(default_factory=list)
    hits: list[SearchHit] = field(default_factory=list)
    candidate_domains: list[str] = field(default_factory=list)
    social_urls: list[str] = field(default_factory=list)
    error: str = ""

    @property
    def only_platforms(self) -> bool:
        """В выдаче только каталоги/соцсети/карты — своего домена нет."""
        if not self.hits:
            return False
        return all(h.url_type != OFFICIAL_WEBSITE for h in self.hits)


class SearchProvider:
    name = "base"

    def __init__(self, config: Config, http: HttpClient) -> None:
        self.config = config
        self.http = http
        self.creds = config.credentials

    async def search(self, query: str, count: int) -> list[SearchHit]:  # pragma: no cover
        raise NotImplementedError


class BraveProvider(SearchProvider):
    name = "brave"
    ENDPOINT = "https://api.search.brave.com/res/v1/web/search"

    async def search(self, query: str, count: int) -> list[SearchHit]:
        payload = await self.http.get_json(
            self.ENDPOINT,
            service="brave",
            params={"q": query, "count": min(20, count), "country": "ru", "search_lang": "ru"},
            headers={
                "X-Subscription-Token": self.creds.brave_key,
                "Accept": "application/json",
            },
        )
        results = ((payload or {}).get("web") or {}).get("results") or []
        return [
            SearchHit(
                url=item.get("url", ""),
                title=item.get("title", ""),
                snippet=item.get("description", ""),
                provider=self.name,
            )
            for item in results
            if item.get("url")
        ]


class GoogleCseProvider(SearchProvider):
    name = "google_cse"
    ENDPOINT = "https://www.googleapis.com/customsearch/v1"

    async def search(self, query: str, count: int) -> list[SearchHit]:
        payload = await self.http.get_json(
            self.ENDPOINT,
            service="google_cse",
            params={
                "key": self.creds.google_cse_key,
                "cx": self.creds.google_cse_cx,
                "q": query,
                "num": min(10, count),
                "hl": "ru",
                "gl": "ru",
            },
        )
        return [
            SearchHit(
                url=item.get("link", ""),
                title=item.get("title", ""),
                snippet=item.get("snippet", ""),
                provider=self.name,
            )
            for item in (payload or {}).get("items", [])
            if item.get("link")
        ]


class SerpApiProvider(SearchProvider):
    name = "serpapi"
    ENDPOINT = "https://serpapi.com/search.json"

    async def search(self, query: str, count: int) -> list[SearchHit]:
        payload = await self.http.get_json(
            self.ENDPOINT,
            service="serpapi",
            params={
                "engine": "google",
                "q": query,
                "num": min(20, count),
                "hl": "ru",
                "gl": "ru",
                "api_key": self.creds.serpapi_key,
            },
        )
        return [
            SearchHit(
                url=item.get("link", ""),
                title=item.get("title", ""),
                snippet=item.get("snippet", ""),
                provider=self.name,
            )
            for item in (payload or {}).get("organic_results", [])
            if item.get("link")
        ]


_PROVIDERS = {
    BraveProvider.name: BraveProvider,
    GoogleCseProvider.name: GoogleCseProvider,
    SerpApiProvider.name: SerpApiProvider,
}


def build_queries(name: str, city: str, category_label: str = "") -> list[str]:
    """Запросы из ТЗ: официальный сайт, просто название, название+тип+город."""
    name = (name or "").strip()
    city = (city or "").strip()
    queries = [
        f'"{name}" {city} официальный сайт',
        f'"{name}" {city}',
    ]
    if category_label:
        queries.append(f"{name} {category_label} {city}")
    return [q.strip() for q in queries if name]


# ---------------------------------------------------------------------------
# Домены-кандидаты из названия (проверка без поискового API)
# ---------------------------------------------------------------------------

_TLDS = (".ru", ".com", ".рф", ".su", ".online", ".cafe", ".rest")


def candidate_domains(name: str, city: str = "", max_candidates: int = 8) -> list[str]:
    """Правдоподобные домены заведения по его названию.

    Это не «угадывание наудачу»: каждый кандидат затем проверяется по содержимому
    страницы (название/телефон/город), и без подтверждения сайтом не считается.
    """
    slug = slugify(name)
    dashed = slugify_dashed(name)
    city_slug = slugify(city)
    if not slug or len(slug) < 3:
        return []

    stems: list[str] = [slug]
    if dashed != slug:
        stems.append(dashed)
    if city_slug and len(slug) < 14:
        stems.append(f"{slug}-{city_slug}")
    if len(slug) < 12:
        stems.extend([f"{slug}cafe", f"restoran-{dashed}"])

    out: list[str] = []
    for stem in stems:
        for tld in (".ru", ".com", ".рф"):
            domain = f"{stem}{tld}"
            normalized = normalize_domain(domain)
            if normalized and normalized not in out:
                out.append(normalized)
            if len(out) >= max_candidates:
                return out
    return out[:max_candidates]


# ---------------------------------------------------------------------------
# Сервис
# ---------------------------------------------------------------------------


class SearchChecker:
    """Выполняет проверку №2 с кэшированием запросов в SQLite."""

    def __init__(self, config: Config, http: HttpClient, repo: Repository) -> None:
        self.config = config
        self.http = http
        self.repo = repo
        self.providers: list[SearchProvider] = [
            _PROVIDERS[name](config, http)
            for name in config.credentials.enabled_search_providers()
            if name in _PROVIDERS
        ]
        self.enabled = bool(self.providers) and config.use_search

    def provider_names(self) -> list[str]:
        return [p.name for p in self.providers]

    async def _search_cached(self, query: str, count: int) -> tuple[list[SearchHit], str, str]:
        key = hashlib.sha1(f"{query}|{count}".encode()).hexdigest()
        if not self.config.refresh:
            cached = self.repo.cache_get("search", key)
            if cached is not None:
                hits = [SearchHit(**h) for h in cached.get("hits", [])]
                return hits, cached.get("provider", ""), cached.get("error", "")

        last_error = ""
        for provider in self.providers:
            if self.http.is_blocked(provider.name):
                continue
            try:
                hits = await provider.search(query, count)
            except ServiceBlocked as exc:
                last_error = str(exc)
                log.warning("Поисковый провайдер %s отключён: %s", provider.name, exc)
                continue
            except Exception as exc:  # noqa: BLE001 — падение одного провайдера не фатально
                last_error = f"{provider.name}: {exc}"
                log.debug("Поиск не удался (%s): %s", provider.name, exc)
                continue

            self.repo.cache_set(
                "search",
                key,
                {"hits": [h.__dict__ for h in hits], "provider": provider.name, "error": ""},
                self.config.ttl_search,
            )
            return hits, provider.name, ""

        if last_error:
            self.repo.cache_set(
                "search", key, {"hits": [], "provider": "", "error": last_error},
                min(3600.0, self.config.ttl_search),
            )
        return [], "", last_error

    async def check(self, *, name: str, city: str, category_label: str = "") -> SearchOutcome:
        outcome = SearchOutcome()
        if not self.enabled:
            outcome.error = "поисковый провайдер не настроен"
            return outcome

        queries = build_queries(name, city, category_label)[: self.config.search_queries_per_place]
        outcome.queries = queries
        seen_urls: set[str] = set()

        for query in queries:
            hits, provider, error = await self._search_cached(
                query, self.config.search_results_per_query
            )
            if error and not hits:
                outcome.error = error
                continue
            outcome.performed = True
            outcome.provider = outcome.provider or provider
            for hit in hits:
                url = normalize_url(hit.url)
                if not url or url in seen_urls:
                    continue
                seen_urls.add(url)
                info = classify_url(url)
                hit.url = url
                hit.url_type = info.type
                hit.domain = info.domain
                outcome.hits.append(hit)

        for hit in outcome.hits:
            if hit.url_type == OFFICIAL_WEBSITE and hit.domain:
                if hit.domain not in outcome.candidate_domains:
                    outcome.candidate_domains.append(hit.domain)
            elif hit.url_type in (SOCIAL_NETWORK, MULTILINK):
                outcome.social_urls.append(hit.url)

        log.debug(
            "поиск «%s %s»: %d результатов, кандидатов-доменов %d",
            name, city, len(outcome.hits), len(outcome.candidate_domains),
        )
        return outcome
