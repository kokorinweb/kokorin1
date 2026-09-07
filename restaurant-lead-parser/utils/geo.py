"""Геометрия: расстояния, bbox, ячейки для блокировки при дедупликации."""
from __future__ import annotations

import math

EARTH_RADIUS_M = 6_371_008.8


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Расстояние между двумя точками в метрах."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = p2 - p1
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def distance_m(
    a: tuple[float | None, float | None], b: tuple[float | None, float | None]
) -> float | None:
    """None, если хоть у одной точки нет координат."""
    if a[0] is None or a[1] is None or b[0] is None or b[1] is None:
        return None
    return haversine_m(a[0], a[1], b[0], b[1])


def grid_cell(lat: float | None, lon: float | None, size_deg: float = 0.005) -> str | None:
    """Ключ ячейки сетки (~500 м) — блок для дедупликации без O(n^2)."""
    if lat is None or lon is None:
        return None
    return f"{int(lat / size_deg)}:{int(lon / size_deg)}"


def neighbour_cells(lat: float | None, lon: float | None, size_deg: float = 0.005) -> list[str]:
    """Ячейка и 8 соседних — чтобы объекты у границы блока тоже сравнивались."""
    if lat is None or lon is None:
        return []
    base_lat, base_lon = int(lat / size_deg), int(lon / size_deg)
    return [
        f"{base_lat + dy}:{base_lon + dx}"
        for dy in (-1, 0, 1)
        for dx in (-1, 0, 1)
    ]


def bbox_around(lat: float, lon: float, radius_km: float) -> tuple[float, float, float, float]:
    """(south, west, north, east) для запроса по радиусу."""
    dlat = radius_km / 111.32
    dlon = radius_km / (111.32 * max(0.1, math.cos(math.radians(lat))))
    return (lat - dlat, lon - dlon, lat + dlat, lon + dlon)
