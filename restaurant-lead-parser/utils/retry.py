"""Retry с экспоненциальным backoff и джиттером (sync и async)."""
from __future__ import annotations

import asyncio
import functools
import random
import time
from typing import Awaitable, Callable, Iterable, TypeVar

from utils.logger import get_logger

log = get_logger(__name__)
T = TypeVar("T")


class RetryableError(Exception):
    """Ошибка, которую имеет смысл повторить.

    ``retry_after`` — секунды из заголовка Retry-After, если сервер их прислал.
    """

    def __init__(self, message: str, retry_after: float | None = None) -> None:
        super().__init__(message)
        self.retry_after = retry_after


class FatalError(Exception):
    """Ошибка, повторять которую бессмысленно (403, невалидный ключ и т.п.)."""


def backoff_delays(
    attempts: int, base: float = 1.0, factor: float = 2.0, cap: float = 60.0, jitter: float = 0.3
) -> list[float]:
    """Задержки между попытками: base, base*factor, ... c джиттером и потолком."""
    delays = []
    for i in range(max(0, attempts - 1)):
        raw = min(cap, base * (factor ** i))
        delays.append(raw * (1.0 + random.uniform(-jitter, jitter)))
    return delays


async def async_retry(
    func: Callable[[], Awaitable[T]],
    *,
    attempts: int = 4,
    base_delay: float = 1.0,
    factor: float = 2.0,
    max_delay: float = 60.0,
    retry_on: Iterable[type[BaseException]] = (RetryableError,),
    label: str = "",
) -> T:
    """Выполняет корутину с повторами. RetryableError.retry_after уважается."""
    retry_types = tuple(retry_on)
    last_exc: BaseException | None = None
    delays = backoff_delays(attempts, base_delay, factor, max_delay)
    for attempt in range(attempts):
        try:
            return await func()
        except FatalError:
            raise
        except retry_types as exc:  # noqa: PERF203 — повторы по определению в цикле
            last_exc = exc
            if attempt == attempts - 1:
                break
            delay = delays[attempt]
            hinted = getattr(exc, "retry_after", None)
            if hinted:
                delay = max(delay, min(float(hinted), max_delay * 2))
            log.debug("retry %s (%d/%d) через %.1fs: %s", label, attempt + 1, attempts, delay, exc)
            await asyncio.sleep(delay)
    assert last_exc is not None
    raise last_exc


def sync_retry(
    *, attempts: int = 4, base_delay: float = 1.0, factor: float = 2.0, max_delay: float = 60.0
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            delays = backoff_delays(attempts, base_delay, factor, max_delay)
            last_exc: BaseException | None = None
            for attempt in range(attempts):
                try:
                    return func(*args, **kwargs)
                except FatalError:
                    raise
                except RetryableError as exc:
                    last_exc = exc
                    if attempt == attempts - 1:
                        break
                    delay = delays[attempt]
                    if getattr(exc, "retry_after", None):
                        delay = max(delay, float(exc.retry_after))
                    time.sleep(delay)
            assert last_exc is not None
            raise last_exc

        return wrapper

    return decorator
