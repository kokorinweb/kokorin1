"""Единый async HTTP-клиент: rate limit на сервис, retry, backoff, 429/403.

Никаких обходов антибот-защиты: получили 403/CAPTCHA — фиксируем и уходим.
"""
from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from typing import Any, Mapping

import httpx

from utils.logger import get_logger
from utils.retry import FatalError, RetryableError, async_retry

log = get_logger(__name__)

DEFAULT_UA = (
    "restaurant-lead-parser/1.0 (+https://github.com/; contact: set OSM_USER_AGENT in .env)"
)

_CAPTCHA_MARKERS = (
    "captcha", "are you a robot", "подтвердите, что вы не робот",
    "checking your browser", "cf-browser-verification", "ddos-guard",
)


@dataclass
class RateLimit:
    """Политика доступа к одному внешнему сервису."""

    name: str
    concurrency: int = 4
    min_interval: float = 0.0       # минимальная пауза между стартами запросов
    attempts: int = 4
    base_delay: float = 1.0
    max_delay: float = 60.0
    timeout: float = 20.0
    _sem: asyncio.Semaphore | None = field(default=None, repr=False, compare=False)
    _last_start: float = field(default=0.0, repr=False, compare=False)
    _lock: asyncio.Lock | None = field(default=None, repr=False, compare=False)

    def semaphore(self) -> asyncio.Semaphore:
        if self._sem is None:
            self._sem = asyncio.Semaphore(max(1, self.concurrency))
        return self._sem

    def lock(self) -> asyncio.Lock:
        if self._lock is None:
            self._lock = asyncio.Lock()
        return self._lock

    async def pace(self) -> None:
        """Держит min_interval между стартами запросов к сервису."""
        if self.min_interval <= 0:
            return
        async with self.lock():
            now = time.monotonic()
            wait = self._last_start + self.min_interval - now
            if wait > 0:
                await asyncio.sleep(wait)
                now = time.monotonic()
            self._last_start = now


class ServiceBlocked(FatalError):
    """403 / антибот / отозванный ключ — сервис для нас закрыт, не долбимся."""


def _retry_after_seconds(response: httpx.Response) -> float | None:
    raw = response.headers.get("retry-after")
    if not raw:
        return None
    try:
        return float(raw)
    except ValueError:
        try:
            from email.utils import parsedate_to_datetime

            dt = parsedate_to_datetime(raw)
            return max(0.0, dt.timestamp() - time.time())
        except Exception:
            return None


class HttpClient:
    """Обёртка над httpx.AsyncClient с политиками по сервисам."""

    def __init__(
        self,
        *,
        default_timeout: float = 20.0,
        user_agent: str = DEFAULT_UA,
        verify: bool = True,
        max_response_bytes: int = 3_000_000,
    ) -> None:
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(default_timeout, connect=min(10.0, default_timeout)),
            follow_redirects=True,
            headers={
                "User-Agent": user_agent,
                "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.6",
            },
            limits=httpx.Limits(max_connections=64, max_keepalive_connections=32),
            verify=verify,
        )
        self._limits: dict[str, RateLimit] = {}
        self._blocked: set[str] = set()
        self.max_response_bytes = max_response_bytes
        self.stats: dict[str, dict[str, int]] = {}

    # -- конфигурация -------------------------------------------------------

    def register(self, limit: RateLimit) -> None:
        self._limits[limit.name] = limit

    def limit_for(self, service: str) -> RateLimit:
        if service not in self._limits:
            self._limits[service] = RateLimit(name=service)
        return self._limits[service]

    def is_blocked(self, service: str) -> bool:
        return service in self._blocked

    def _bump(self, service: str, key: str) -> None:
        self.stats.setdefault(service, {}).setdefault(key, 0)
        self.stats[service][key] += 1

    # -- запросы ------------------------------------------------------------

    async def request(
        self,
        method: str,
        url: str,
        *,
        service: str,
        params: Mapping[str, Any] | None = None,
        data: Any = None,
        json: Any = None,
        headers: Mapping[str, str] | None = None,
        timeout: float | None = None,
        allow_status: tuple[int, ...] = (),
    ) -> httpx.Response:
        """Запрос с учётом лимитов сервиса. Бросает RetryableError/ServiceBlocked."""
        if service in self._blocked:
            raise ServiceBlocked(f"{service}: сервис помечен как недоступный (403/блокировка)")

        rl = self.limit_for(service)
        effective_timeout = timeout or rl.timeout

        async def attempt() -> httpx.Response:
            async with rl.semaphore():
                await rl.pace()
                self._bump(service, "requests")
                try:
                    response = await self._client.request(
                        method,
                        url,
                        params=params,
                        data=data,
                        json=json,
                        headers=dict(headers or {}),
                        timeout=effective_timeout,
                    )
                except (httpx.TimeoutException, httpx.NetworkError, httpx.RemoteProtocolError) as exc:
                    self._bump(service, "network_errors")
                    raise RetryableError(f"{service}: {type(exc).__name__}: {exc}") from exc
                except httpx.HTTPError as exc:
                    self._bump(service, "errors")
                    raise FatalError(f"{service}: {type(exc).__name__}: {exc}") from exc

            status = response.status_code
            if status in allow_status or status < 400:
                return response
            if status == 429:
                self._bump(service, "http_429")
                raise RetryableError(
                    f"{service}: 429 rate limit", retry_after=_retry_after_seconds(response)
                )
            if status in (401, 403, 407, 451):
                self._bump(service, "http_403")
                # 403 — это отказ в доступе. Не обходим, а выключаем сервис.
                self._blocked.add(service)
                raise ServiceBlocked(f"{service}: HTTP {status} — доступ запрещён, источник отключён")
            if status in (408, 425, 500, 502, 503, 504, 509, 522, 524):
                self._bump(service, f"http_{status}")
                raise RetryableError(
                    f"{service}: HTTP {status}", retry_after=_retry_after_seconds(response)
                )
            self._bump(service, f"http_{status}")
            raise FatalError(f"{service}: HTTP {status}")

        return await async_retry(
            attempt,
            attempts=rl.attempts,
            base_delay=rl.base_delay,
            max_delay=rl.max_delay,
            label=f"{service} {method} {url[:80]}",
        )

    async def get(self, url: str, **kwargs: Any) -> httpx.Response:
        return await self.request("GET", url, **kwargs)

    async def post(self, url: str, **kwargs: Any) -> httpx.Response:
        return await self.request("POST", url, **kwargs)

    async def get_json(self, url: str, **kwargs: Any) -> Any:
        response = await self.get(url, **kwargs)
        try:
            return response.json()
        except ValueError as exc:
            raise RetryableError(f"невалидный JSON от {url[:80]}: {exc}") from exc

    async def get_text(self, url: str, *, service: str, **kwargs: Any) -> tuple[httpx.Response, str]:
        """GET с ограничением размера тела и детектом антибот-заглушек."""
        response = await self.get(url, service=service, **kwargs)
        raw = response.content[: self.max_response_bytes]
        encoding = response.charset_encoding or "utf-8"
        try:
            text = raw.decode(encoding, errors="replace")
        except LookupError:
            text = raw.decode("utf-8", errors="replace")
        lowered = text[:6000].lower()
        if any(marker in lowered for marker in _CAPTCHA_MARKERS):
            raise ServiceBlocked(f"{url[:80]}: антибот-проверка, страница пропущена")
        return response, text

    async def aclose(self) -> None:
        await self._client.aclose()

    async def __aenter__(self) -> "HttpClient":
        return self

    async def __aexit__(self, *_exc: object) -> None:
        await self.aclose()
