"""Доступ к SQLite: заведения, кэш проверок, прогресс обхода (resume)."""
from __future__ import annotations

import json
import sqlite3
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Iterable, Iterator

from database.models import SCHEMA, Place, utcnow_iso
from utils.logger import get_logger

log = get_logger(__name__)


class Repository:
    """Потокобезопасный (через один Lock) репозиторий поверх sqlite3."""

    def __init__(self, db_path: str | Path) -> None:
        self.path = Path(db_path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._conn = sqlite3.connect(self.path, check_same_thread=False, timeout=30.0)
        self._conn.row_factory = sqlite3.Row
        with self._lock:
            self._conn.executescript(SCHEMA)
            self._conn.commit()

    # -- заведения ----------------------------------------------------------

    def upsert_place(self, place: Place) -> None:
        self.upsert_places([place])

    def upsert_places(self, places: Iterable[Place]) -> int:
        rows = []
        for place in places:
            place.updated_at = utcnow_iso()
            rows.append(place.to_row())
        if not rows:
            return 0
        columns = list(rows[0].keys())
        placeholders = ", ".join(f":{c}" for c in columns)
        updates = ", ".join(f"{c}=excluded.{c}" for c in columns if c != "place_key")
        sql = (
            f"INSERT INTO places ({', '.join(columns)}) VALUES ({placeholders}) "
            f"ON CONFLICT(place_key) DO UPDATE SET {updates}"
        )
        with self._lock:
            self._conn.executemany(sql, rows)
            self._conn.commit()
        return len(rows)

    def get_place(self, place_key: str) -> Place | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM places WHERE place_key = ?", (place_key,)
            ).fetchone()
        return Place.from_row(row) if row else None

    def iter_places(
        self,
        *,
        city: str | None = None,
        region: str | None = None,
        statuses: Iterable[str] | None = None,
        include_excluded: bool = False,
        limit: int | None = None,
    ) -> Iterator[Place]:
        clauses, params = [], []
        if city:
            clauses.append("city = ?")
            params.append(city)
        if region:
            clauses.append("region = ?")
            params.append(region)
        if statuses:
            statuses = list(statuses)
            clauses.append(f"website_status IN ({', '.join('?' * len(statuses))})")
            params.extend(statuses)
        if not include_excluded:
            clauses.append("excluded = 0")
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        sql = (
            f"SELECT * FROM places {where} "
            "ORDER BY lead_score DESC, website_confidence DESC, reviews_count DESC"
        )
        if limit:
            sql += f" LIMIT {int(limit)}"
        with self._lock:
            rows = self._conn.execute(sql, params).fetchall()
        for row in rows:
            yield Place.from_row(row)

    def list_places(self, **kwargs: Any) -> list[Place]:
        return list(self.iter_places(**kwargs))

    def count_places(self, **kwargs: Any) -> int:
        return sum(1 for _ in self.iter_places(**kwargs))

    def delete_places_for_city(self, city: str) -> int:
        with self._lock:
            cur = self._conn.execute("DELETE FROM places WHERE city = ?", (city,))
            self._conn.commit()
        return cur.rowcount

    # -- кэш ----------------------------------------------------------------

    def cache_get(self, namespace: str, key: str) -> Any | None:
        cache_key = f"{namespace}:{key}"
        with self._lock:
            row = self._conn.execute(
                "SELECT payload, expires_at FROM cache WHERE cache_key = ?", (cache_key,)
            ).fetchone()
        if not row:
            return None
        if row["expires_at"] is not None and row["expires_at"] < time.time():
            with self._lock:
                self._conn.execute("DELETE FROM cache WHERE cache_key = ?", (cache_key,))
                self._conn.commit()
            return None
        try:
            return json.loads(row["payload"])
        except json.JSONDecodeError:
            return None

    def cache_set(self, namespace: str, key: str, value: Any, ttl_seconds: float | None) -> None:
        now = time.time()
        with self._lock:
            self._conn.execute(
                "INSERT INTO cache (cache_key, namespace, payload, created_at, expires_at) "
                "VALUES (?, ?, ?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET "
                "payload=excluded.payload, created_at=excluded.created_at, "
                "expires_at=excluded.expires_at",
                (
                    f"{namespace}:{key}",
                    namespace,
                    json.dumps(value, ensure_ascii=False),
                    now,
                    (now + ttl_seconds) if ttl_seconds else None,
                ),
            )
            self._conn.commit()

    def cache_purge_expired(self) -> int:
        with self._lock:
            cur = self._conn.execute(
                "DELETE FROM cache WHERE expires_at IS NOT NULL AND expires_at < ?", (time.time(),)
            )
            self._conn.commit()
        return cur.rowcount

    def cache_clear(self, namespace: str | None = None) -> int:
        with self._lock:
            if namespace:
                cur = self._conn.execute("DELETE FROM cache WHERE namespace = ?", (namespace,))
            else:
                cur = self._conn.execute("DELETE FROM cache")
            self._conn.commit()
        return cur.rowcount

    # -- прогресс (resume) --------------------------------------------------

    @staticmethod
    def scope_key(source: str, city: str, category: str = "*") -> str:
        return f"{source}|{city}|{category}"

    def progress_status(self, source: str, city: str, category: str = "*") -> str | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT status FROM harvest_progress WHERE scope_key = ?",
                (self.scope_key(source, city, category),),
            ).fetchone()
        return row["status"] if row else None

    def mark_progress(
        self,
        source: str,
        city: str,
        status: str,
        *,
        category: str = "*",
        region: str = "",
        found: int = 0,
        error: str = "",
    ) -> None:
        with self._lock:
            self._conn.execute(
                "INSERT INTO harvest_progress "
                "(scope_key, source, city, region, category, status, found, error, updated_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) "
                "ON CONFLICT(scope_key) DO UPDATE SET status=excluded.status, "
                "found=excluded.found, error=excluded.error, updated_at=excluded.updated_at",
                (
                    self.scope_key(source, city, category), source, city, region, category,
                    status, found, error, utcnow_iso(),
                ),
            )
            self._conn.commit()

    def reset_progress(self) -> int:
        with self._lock:
            cur = self._conn.execute("DELETE FROM harvest_progress")
            self._conn.commit()
        return cur.rowcount

    def completed_cities(self, source: str) -> set[str]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT city FROM harvest_progress WHERE source = ? AND status = 'done'",
                (source,),
            ).fetchall()
        return {row["city"] for row in rows}

    # -- запуски ------------------------------------------------------------

    def start_run(self, scope: str, params: dict[str, Any]) -> str:
        run_id = uuid.uuid4().hex[:12]
        with self._lock:
            self._conn.execute(
                "INSERT INTO runs (run_id, started_at, scope, params) VALUES (?, ?, ?, ?)",
                (run_id, utcnow_iso(), scope, json.dumps(params, ensure_ascii=False, default=str)),
            )
            self._conn.commit()
        return run_id

    def finish_run(self, run_id: str, stats: dict[str, Any]) -> None:
        with self._lock:
            self._conn.execute(
                "UPDATE runs SET finished_at = ?, stats = ? WHERE run_id = ?",
                (utcnow_iso(), json.dumps(stats, ensure_ascii=False, default=str), run_id),
            )
            self._conn.commit()

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    def __enter__(self) -> "Repository":
        return self

    def __exit__(self, *_exc: object) -> None:
        self.close()
