"""Логирование: цветной вывод в терминал + ротация файлового лога."""
from __future__ import annotations

import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

_COLORS = {
    "DEBUG": "\033[38;5;244m",
    "INFO": "\033[38;5;39m",
    "WARNING": "\033[38;5;214m",
    "ERROR": "\033[38;5;203m",
    "CRITICAL": "\033[48;5;203;38;5;231m",
}
_RESET = "\033[0m"
_CONFIGURED = False


class _ColorFormatter(logging.Formatter):
    def __init__(self, fmt: str, use_color: bool) -> None:
        super().__init__(fmt, datefmt="%H:%M:%S")
        self.use_color = use_color

    def format(self, record: logging.LogRecord) -> str:
        text = super().format(record)
        if not self.use_color:
            return text
        color = _COLORS.get(record.levelname, "")
        return f"{color}{text}{_RESET}" if color else text


def setup_logging(level: str = "INFO", log_dir: str | os.PathLike[str] = "logs") -> None:
    """Настраивает корневой логгер. Идемпотентна."""
    global _CONFIGURED
    if _CONFIGURED:
        logging.getLogger().setLevel(getattr(logging, str(level).upper(), logging.INFO))
        return

    root = logging.getLogger()
    root.setLevel(getattr(logging, str(level).upper(), logging.INFO))
    for handler in list(root.handlers):
        root.removeHandler(handler)

    use_color = sys.stderr.isatty() and os.environ.get("NO_COLOR") is None
    console = logging.StreamHandler(stream=sys.stderr)
    console.setFormatter(_ColorFormatter("%(asctime)s %(levelname)-7s %(name)-22s %(message)s", use_color))
    root.addHandler(console)

    try:
        path = Path(log_dir)
        path.mkdir(parents=True, exist_ok=True)
        file_handler = RotatingFileHandler(
            path / "parser.log", maxBytes=8 * 1024 * 1024, backupCount=3, encoding="utf-8"
        )
        file_handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)-7s %(name)s %(message)s")
        )
        root.addHandler(file_handler)
    except OSError:  # только консоль, если каталог недоступен
        pass

    for noisy in ("httpx", "httpcore", "hpack", "asyncio", "urllib3"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    _CONFIGURED = True


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
