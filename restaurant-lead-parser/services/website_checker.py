"""Проверка №4: действительно ли найденный домен — сайт ЭТОГО заведения.

Домен из поисковой выдачи сам по себе ничего не значит. Мы открываем страницу
и ищем на ней подтверждения: название, телефон, город, адрес.
"""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field

from bs4 import BeautifulSoup
from rapidfuzz import fuzz

from config import Config
from database.repository import Repository
from services.domain_classifier import OFFICIAL_WEBSITE, classify_url
from utils.http import HttpClient, ServiceBlocked
from utils.logger import get_logger
from utils.normalization import (
    name_tokens, normalize_business_name, normalize_domain, phone_digits,
)
from utils.retry import FatalError, RetryableError

log = get_logger(__name__)

#: страницы-заглушки: домен куплен, но сайта нет
_PARKED_MARKERS = (
    "домен продается", "домен продаётся", "this domain is for sale", "buy this domain",
    "domain is parked", "домен припаркован", "сайт находится в разработке",
    "страница не найдена", "under construction", "coming soon", "сайт создан в",
    "здесь будет сайт", "hosting default page", "welcome to nginx", "apache2 ubuntu default",
    "it works!", "default web site page", "срок регистрации домена истек",
    "account suspended", "директория пуста",
)

_MIN_CONTENT_CHARS = 400
_VERIFY_THRESHOLD = 55        # порог суммарной уверенности, что домен принадлежит заведению


@dataclass
class DomainCheck:
    """Результат проверки одного домена."""

    domain: str
    url: str = ""
    reachable: bool = False
    http_status: int | None = None
    final_url: str = ""
    final_domain: str = ""
    redirected_offsite: bool = False
    title: str = ""
    is_parked: bool = False
    name_match: float = 0.0
    phone_match: bool = False
    city_match: bool = False
    address_match: bool = False
    url_type: str = ""
    score: int = 0
    verified: bool = False
    reason: str = ""
    error: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class WebsiteEvidence:
    """Сводка по всем проверенным доменам одного заведения."""

    checks: list[DomainCheck] = field(default_factory=list)
    verified: DomainCheck | None = None
    any_reachable: bool = False
    failures: int = 0


def _visible_text(html: str) -> tuple[str, str]:
    """(title, текст страницы) — без скриптов и стилей."""
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()
    title = (soup.title.string or "").strip() if soup.title and soup.title.string else ""
    meta_bits = []
    for prop in ("description", "og:title", "og:description", "og:site_name"):
        node = soup.find("meta", attrs={"name": prop}) or soup.find("meta", attrs={"property": prop})
        if node and node.get("content"):
            meta_bits.append(node["content"])
    text = " ".join(soup.get_text(" ", strip=True).split())
    return title, " ".join([title, *meta_bits, text])


def score_domain_match(
    check: DomainCheck,
    *,
    name: str,
    phones: list[str],
    city: str,
    address: str,
    page_text: str,
) -> DomainCheck:
    """Считает, насколько страница похожа на сайт именно этого заведения."""
    haystack = page_text.lower().replace("ё", "е")
    normalized_haystack = re.sub(r"[^0-9a-zа-я ]+", " ", haystack)

    # --- название ---
    norm_name = normalize_business_name(name)
    tokens = name_tokens(name)
    title_score = fuzz.token_set_ratio(norm_name, normalize_business_name(check.title)) if norm_name else 0.0
    body_hit = 0.0
    if tokens:
        found = sum(1 for t in tokens if t in normalized_haystack)
        body_hit = 100.0 * found / len(tokens)
    elif norm_name and norm_name in normalized_haystack:
        body_hit = 100.0
    check.name_match = max(title_score, body_hit)

    # --- телефон ---
    digits_only = re.sub(r"\D", "", haystack)
    for phone in phones:
        tail = phone_digits(phone)
        if tail and len(tail) >= 9 and tail in digits_only:
            check.phone_match = True
            break

    # --- город и адрес ---
    city_norm = (city or "").lower().replace("ё", "е")
    if city_norm and len(city_norm) > 3:
        check.city_match = city_norm[:-1] in normalized_haystack or city_norm in normalized_haystack

    street_tokens = [
        t for t in re.split(r"[^0-9a-zа-яё]+", (address or "").lower().replace("ё", "е"))
        if len(t) > 4 and t not in ("улица", "проспект", "переулок", "площадь", "бульвар")
    ]
    if street_tokens:
        check.address_match = any(t in normalized_haystack for t in street_tokens[:4])

    # --- сумма ---
    score = 0
    if check.name_match >= 85:
        score += 55
    elif check.name_match >= 65:
        score += 40
    elif check.name_match >= 45:
        score += 20
    if check.phone_match:
        score += 40
    if check.city_match:
        score += 12
    if check.address_match:
        score += 15
    if check.is_parked:
        score -= 60
    if check.redirected_offsite:
        score -= 25
    if not check.reachable:
        score = 0

    check.score = max(0, min(100, score))
    # Подтверждаем, только если совпало название И (телефон ИЛИ город/адрес),
    # либо телефон совпал точно (уникальный идентификатор).
    # Одного совпадения названия НЕДОСТАТОЧНО: одноимённое заведение в другом
    # городе — типовой ложный положительный результат поисковой выдачи.
    strong_name = check.name_match >= 65
    check.verified = bool(
        check.reachable
        and not check.is_parked
        and check.url_type == OFFICIAL_WEBSITE
        and check.score >= _VERIFY_THRESHOLD
        and (
            check.phone_match
            or (strong_name and (check.city_match or check.address_match))
        )
    )

    bits = []
    if check.name_match:
        bits.append(f"название {check.name_match:.0f}%")
    if check.phone_match:
        bits.append("телефон совпал")
    if check.city_match:
        bits.append("город совпал")
    if check.address_match:
        bits.append("адрес совпал")
    if check.is_parked:
        bits.append("домен-заглушка")
    if check.redirected_offsite:
        bits.append(f"редирект на {check.final_domain}")
    check.reason = ", ".join(bits) or "совпадений не найдено"
    return check


class WebsiteChecker:
    """HTTP-проверка доменов с кэшированием результатов."""

    def __init__(self, config: Config, http: HttpClient, repo: Repository) -> None:
        self.config = config
        self.http = http
        self.repo = repo

    async def _fetch(self, domain: str) -> tuple[DomainCheck, str]:
        check = DomainCheck(domain=domain)
        last_error = ""
        for scheme in ("https", "http"):
            url = f"{scheme}://{domain}/"
            check.url = url
            try:
                response, text = await self.http.get_text(url, service="website")
            except ServiceBlocked as exc:
                last_error = str(exc)
                continue
            except (RetryableError, FatalError) as exc:
                last_error = str(exc)
                continue
            except Exception as exc:  # noqa: BLE001
                last_error = f"{type(exc).__name__}: {exc}"
                continue

            check.reachable = True
            check.http_status = response.status_code
            check.final_url = str(response.url)
            check.final_domain = normalize_domain(check.final_url) or domain
            check.redirected_offsite = check.final_domain != domain
            check.url_type = classify_url(check.final_url).type

            title, page_text = _visible_text(text)
            check.title = title[:300]
            lowered = page_text.lower()
            check.is_parked = (
                len(page_text) < _MIN_CONTENT_CHARS
                or any(marker in lowered[:4000] for marker in _PARKED_MARKERS)
            )
            return check, page_text

        check.error = last_error or "домен недоступен"
        return check, ""

    async def check_domain(
        self,
        domain: str,
        *,
        name: str,
        phones: list[str],
        city: str,
        address: str,
    ) -> DomainCheck:
        domain = normalize_domain(domain) or ""
        if not domain:
            return DomainCheck(domain="", error="пустой домен")

        cache_key = f"{domain}|{normalize_business_name(name)}"
        if not self.config.refresh:
            cached = self.repo.cache_get("domain", cache_key)
            if cached:
                return DomainCheck(**cached)

        check, page_text = await self._fetch(domain)
        if check.reachable:
            check = score_domain_match(
                check, name=name, phones=phones, city=city, address=address, page_text=page_text
            )
        else:
            check.reason = check.error

        self.repo.cache_set("domain", cache_key, check.to_dict(), self.config.ttl_domain)
        return check

    async def check_domains(
        self,
        domains: list[str],
        *,
        name: str,
        phones: list[str],
        city: str,
        address: str,
        stop_on_verified: bool = True,
    ) -> WebsiteEvidence:
        evidence = WebsiteEvidence()
        seen: set[str] = set()
        for raw in domains:
            domain = normalize_domain(raw) or ""
            if not domain or domain in seen:
                continue
            seen.add(domain)
            check = await self.check_domain(
                domain, name=name, phones=phones, city=city, address=address
            )
            evidence.checks.append(check)
            if check.reachable:
                evidence.any_reachable = True
            else:
                evidence.failures += 1
            if check.verified:
                evidence.verified = check
                if stop_on_verified:
                    break
        return evidence
