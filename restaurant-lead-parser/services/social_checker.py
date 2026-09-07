"""Проверка №3: ссылки на сайт из публичных профилей соцсетей.

VK — через официальный API (нужен сервисный ключ).
Telegram — публичная страница t.me/<username> (открытые данные, без авторизации).
Instagram НЕ парсится: их данные закрыты авторизацией, обходить защиту нельзя.
Ссылку на Instagram мы только фиксируем как факт присутствия.
"""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field

from bs4 import BeautifulSoup

from config import Config
from database.repository import Repository
from services.domain_classifier import OFFICIAL_WEBSITE, classify_url, social_network_of
from utils.http import HttpClient, ServiceBlocked
from utils.logger import get_logger
from utils.normalization import extract_host, normalize_url

log = get_logger(__name__)

VK_API = "https://api.vk.com/method"
_VK_SCREEN_RE = re.compile(r"vk\.com/([A-Za-z0-9_.]+)", re.IGNORECASE)
_TG_RE = re.compile(r"t\.me/(?:s/)?([A-Za-z0-9_]+)", re.IGNORECASE)
_URL_IN_TEXT_RE = re.compile(r"(?:https?://)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:/[^\s,;\)\]]*)?", re.IGNORECASE)


@dataclass
class SocialProfile:
    network: str
    url: str = ""
    handle: str = ""
    found: bool = False
    #: True только если содержимое профиля действительно прочитано.
    #: Без этого нельзя утверждать «в соцсетях ссылки на сайт нет».
    inspected: bool = False
    site_from_profile: str = ""
    followers: int | None = None
    verified_account: bool = False
    error: str = ""


@dataclass
class SocialOutcome:
    """Итог проверки №3."""

    performed: bool = False
    profiles: list[SocialProfile] = field(default_factory=list)
    site_candidates: list[str] = field(default_factory=list)
    has_any_profile: bool = False
    total_followers: int = 0
    error: str = ""

    @property
    def profiles_found(self) -> int:
        return sum(1 for p in self.profiles if p.found)

    @property
    def profiles_inspected(self) -> int:
        return sum(1 for p in self.profiles if p.inspected)

    def to_dict(self) -> dict:
        return {
            "performed": self.performed,
            "profiles": [asdict(p) for p in self.profiles],
            "site_candidates": self.site_candidates,
            "has_any_profile": self.has_any_profile,
            "profiles_found": self.profiles_found,
            "profiles_inspected": self.profiles_inspected,
            "total_followers": self.total_followers,
            "error": self.error,
        }


def _extract_urls(text: str) -> list[str]:
    out: list[str] = []
    for match in _URL_IN_TEXT_RE.findall(text or ""):
        url = normalize_url(match)
        if url and url not in out:
            out.append(url)
    return out


class SocialChecker:
    def __init__(self, config: Config, http: HttpClient, repo: Repository) -> None:
        self.config = config
        self.http = http
        self.repo = repo
        self.vk_enabled = bool(config.credentials.vk_token)

    # -- VK -----------------------------------------------------------------

    async def _vk_call(self, method: str, params: dict) -> dict | None:
        payload = dict(params)
        payload["access_token"] = self.config.credentials.vk_token
        payload["v"] = self.config.credentials.vk_api_version
        payload["lang"] = "ru"
        try:
            data = await self.http.get_json(f"{VK_API}/{method}", service="vk", params=payload)
        except ServiceBlocked as exc:
            log.warning("VK API отключён: %s", exc)
            return None
        except Exception as exc:  # noqa: BLE001
            log.debug("VK %s не удался: %s", method, exc)
            return None
        if "error" in data:
            error = data["error"]
            log.debug("VK %s ошибка %s: %s", method, error.get("error_code"), error.get("error_msg"))
            if error.get("error_code") in (5, 27, 28):  # проблемы с токеном
                self.vk_enabled = False
            return None
        return data.get("response")

    @staticmethod
    def _vk_groups(response: dict | list | None) -> list[dict]:
        if not response:
            return []
        if isinstance(response, list):
            return response
        return response.get("groups") or response.get("items") or []

    async def _vk_profile(self, url: str) -> SocialProfile:
        profile = SocialProfile(network="vk", url=url)
        match = _VK_SCREEN_RE.search(url)
        if not match:
            profile.error = "не удалось разобрать ссылку VK"
            return profile
        profile.handle = match.group(1)
        if not self.vk_enabled:
            profile.found = True     # страница есть, но содержимое НЕ прочитано
            profile.inspected = False
            profile.error = "VK_SERVICE_TOKEN не задан — ссылка из профиля не проверена"
            return profile

        cache_key = f"group:{profile.handle.lower()}"
        cached = None if self.config.refresh else self.repo.cache_get("vk", cache_key)
        if cached is None:
            response = await self._vk_call(
                "groups.getById",
                {"group_id": profile.handle, "fields": "site,description,members_count,status,verified,city,addresses"},
            )
            groups = self._vk_groups(response)
            cached = groups[0] if groups else {}
            self.repo.cache_set("vk", cache_key, cached, self.config.ttl_social)

        if not cached:
            profile.error = "сообщество не найдено"
            return profile

        profile.found = True
        profile.inspected = True
        profile.followers = cached.get("members_count")
        profile.verified_account = bool(cached.get("verified"))
        blob = " ".join(str(cached.get(k, "")) for k in ("site", "description", "status"))
        for candidate in _extract_urls(blob):
            if classify_url(candidate).type == OFFICIAL_WEBSITE:
                profile.site_from_profile = candidate
                break
        return profile

    async def vk_search_group(self, name: str, city: str) -> str:
        """Ищет официальное сообщество заведения, если ссылки не было в каталоге."""
        if not self.vk_enabled:
            return ""
        query = f"{name} {city}".strip()
        cache_key = f"search:{query.lower()}"
        cached = None if self.config.refresh else self.repo.cache_get("vk", cache_key)
        if cached is None:
            response = await self._vk_call("groups.search", {"q": query, "count": 5, "type": "group,page"})
            cached = self._vk_groups(response)
            self.repo.cache_set("vk", cache_key, cached, self.config.ttl_social)

        from rapidfuzz import fuzz

        from utils.normalization import normalize_business_name

        target = normalize_business_name(name)
        best_url, best_score = "", 0.0
        for group in cached or []:
            score = fuzz.token_set_ratio(target, normalize_business_name(group.get("name", "")))
            if score > best_score:
                best_score = score
                screen = group.get("screen_name") or f"club{group.get('id')}"
                best_url = f"https://vk.com/{screen}"
        return best_url if best_score >= 85 else ""

    # -- Telegram -----------------------------------------------------------

    async def _telegram_profile(self, url: str) -> SocialProfile:
        profile = SocialProfile(network="telegram", url=url)
        match = _TG_RE.search(url)
        if not match:
            profile.error = "не удалось разобрать ссылку Telegram"
            return profile
        profile.handle = match.group(1)

        cache_key = f"tg:{profile.handle.lower()}"
        cached = None if self.config.refresh else self.repo.cache_get("social", cache_key)
        if cached is None:
            page = {"ok": False, "text": "", "found": False}
            try:
                _, html = await self.http.get_text(
                    f"https://t.me/{profile.handle}", service="telegram"
                )
                soup = BeautifulSoup(html, "lxml")
                description = soup.find("meta", attrs={"property": "og:description"})
                title = soup.find("meta", attrs={"property": "og:title"})
                body = soup.select_one(".tgme_page_description")
                links = [a.get("href", "") for a in soup.select(".tgme_page_description a[href]")]
                page = {
                    "ok": True,
                    "found": bool(title),
                    "text": " ".join(
                        filter(None, [
                            description.get("content") if description else "",
                            body.get_text(" ", strip=True) if body else "",
                            " ".join(links),
                        ])
                    ),
                }
            except ServiceBlocked as exc:
                page = {"ok": False, "found": False, "text": "", "error": str(exc)}
            except Exception as exc:  # noqa: BLE001
                page = {"ok": False, "found": False, "text": "", "error": str(exc)}
            cached = page
            self.repo.cache_set("social", cache_key, cached, self.config.ttl_social)

        profile.found = bool(cached.get("found"))
        profile.inspected = bool(cached.get("ok"))
        profile.error = cached.get("error", "")
        for candidate in _extract_urls(cached.get("text", "")):
            if classify_url(candidate).type == OFFICIAL_WEBSITE:
                profile.site_from_profile = candidate
                break
        return profile

    # -- публичный метод ----------------------------------------------------

    async def check(
        self, *, name: str, city: str, social_urls: list[str], search_socials: list[str] | None = None
    ) -> SocialOutcome:
        outcome = SocialOutcome()
        if not self.config.socials_enabled():
            outcome.error = "проверка соцсетей отключена"
            return outcome

        urls = list(dict.fromkeys([*(social_urls or []), *(search_socials or [])]))
        by_network: dict[str, str] = {}
        for url in urls:
            network = social_network_of(url)
            if network and network not in by_network:
                by_network[network] = url

        if "vk" not in by_network and self.vk_enabled:
            found = await self.vk_search_group(name, city)
            if found:
                by_network["vk"] = found

        for network, url in by_network.items():
            if network == "vk":
                profile = await self._vk_profile(url)
            elif network == "telegram":
                profile = await self._telegram_profile(url)
            else:
                # Instagram/Facebook/OK: фиксируем присутствие, содержимое не трогаем
                profile = SocialProfile(
                    network=network, url=url, handle=extract_host(url) or "", found=True,
                    inspected=False,
                    error="содержимое профиля закрыто, проверка ссылки не выполнялась",
                )
            outcome.profiles.append(profile)
            if profile.found:
                outcome.has_any_profile = True
            if profile.followers:
                outcome.total_followers += int(profile.followers)
            if profile.site_from_profile:
                outcome.site_candidates.append(profile.site_from_profile)

        outcome.performed = True
        return outcome
