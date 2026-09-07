"""Расчёт website_confidence — вероятности (0–100), что своего сайта НЕТ.

Чистая функция без сети: на вход факты проверок, на выход статус, число и
человекочитаемое обоснование. Именно её проверяют unit-тесты.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from database.models import (
    CHECK_FAILED, HAS_WEBSITE, NO_WEBSITE_HIGH_CONFIDENCE,
    NO_WEBSITE_MEDIUM_CONFIDENCE, UNCERTAIN,
)

#: пороги статусов
HIGH_THRESHOLD = 85
MEDIUM_THRESHOLD = 70

#: вклад отдельных проверок
BASE_NO_CATALOG_SITE = 70          # в карточке источника сайта нет
BONUS_SEARCH_NO_DOMAIN = 15        # поиск отработал и своего домена не нашёл
BONUS_SEARCH_ONLY_PLATFORMS = 3    # в выдаче одни каталоги/соцсети/карты
BONUS_PROBE_NO_DOMAIN = 8          # перебор вероятных доменов ничего не подтвердил
BONUS_SOCIAL_NO_SITE = 7           # соцсети найдены, ссылки на сайт в них нет
BONUS_NO_SOCIAL_AT_ALL = 3         # соцсетей вообще не нашли — данных меньше

#: штрафы: есть похожий домен, но привязать его к заведению не удалось
PENALTY_UNCONFIRMED_SEARCH_DOMAIN = -12
PENALTY_UNCONFIRMED_SOCIAL_LINK = -15


@dataclass
class ConfidenceInput:
    """Факты, собранные проверками №1–№4."""

    # проверка №1 — карточка бизнеса
    catalog_website: str = ""              # что было в поле website источника
    catalog_website_is_own_domain: bool = False

    # подтверждённый собственный сайт (любой из проверок)
    verified_domain: str = ""
    verified_source: str = ""              # catalog | search | social | probe
    verified_reason: str = ""

    # проверка №2 — поиск
    search_performed: bool = False
    search_hits: int = 0
    search_found_own_domain: bool = False
    search_only_platforms: bool = False

    # проверка №3 — соцсети
    social_checked: bool = False
    social_profiles_found: int = 0      # сколько профилей вообще найдено
    social_profiles_inspected: int = 0  # сколько из них реально прочитано
    social_site_links: int = 0

    # проверка №4 — проверка доменов
    domains_checked: int = 0
    probe_performed: bool = False
    catalog_domain_dead: bool = False      # сайт из карточки не открылся/заглушка

    # техническое
    check_failed: bool = False
    failure_reason: str = ""
    notes: list[str] = field(default_factory=list)


@dataclass
class ConfidenceResult:
    status: str
    confidence: int
    reason: str
    breakdown: dict[str, int] = field(default_factory=dict)


def status_for(confidence: int) -> str:
    if confidence >= HIGH_THRESHOLD:
        return NO_WEBSITE_HIGH_CONFIDENCE
    if confidence >= MEDIUM_THRESHOLD:
        return NO_WEBSITE_MEDIUM_CONFIDENCE
    return UNCERTAIN


def compute_confidence(data: ConfidenceInput) -> ConfidenceResult:
    """Возвращает статус, confidence 0–100 и обоснование."""

    # --- сайт подтверждён -> лидом не является ---
    if data.verified_domain:
        reason = (
            f"найден и подтверждён собственный сайт {data.verified_domain} "
            f"(источник: {data.verified_source or 'проверка'}"
            + (f"; {data.verified_reason}" if data.verified_reason else "")
            + ")"
        )
        return ConfidenceResult(HAS_WEBSITE, 0, reason, {"verified": 1})

    # --- в карточке был свой домен, но подтвердить не удалось ---
    if data.catalog_website_is_own_domain:
        if data.catalog_domain_dead:
            return ConfidenceResult(
                UNCERTAIN,
                50,
                f"в карточке указан домен {data.catalog_website}, но он не отвечает или это "
                "заглушка — нужна ручная проверка (возможен лид на новый сайт)",
                {"catalog_domain_dead": 1},
            )
        return ConfidenceResult(
            HAS_WEBSITE,
            0,
            f"в карточке источника указан собственный домен {data.catalog_website}",
            {"catalog_site": 1},
        )

    # --- проверки не отработали ---
    if data.check_failed and not data.search_performed and not data.social_checked:
        return ConfidenceResult(
            CHECK_FAILED, 0, data.failure_reason or "проверки не выполнены", {}
        )

    breakdown: dict[str, int] = {"нет сайта в карточке источника": BASE_NO_CATALOG_SITE}
    score = BASE_NO_CATALOG_SITE
    reasons = ["в карточке источника сайт не указан"]

    if data.search_performed:
        if data.search_found_own_domain:
            # своё доменное имя в выдаче было, но проверкой №4 не подтвердилось
            score += PENALTY_UNCONFIRMED_SEARCH_DOMAIN
            breakdown["поиск: домен не подтверждён"] = PENALTY_UNCONFIRMED_SEARCH_DOMAIN
            reasons.append(
                "в поиске были похожие домены, но принадлежность заведению не подтвердилась — "
                "нужна ручная проверка"
            )
        else:
            score += BONUS_SEARCH_NO_DOMAIN
            breakdown["поиск не нашёл собственного домена"] = BONUS_SEARCH_NO_DOMAIN
            reasons.append(f"поиск ({data.search_hits} результатов) собственного домена не дал")
            if data.search_only_platforms and data.search_hits:
                score += BONUS_SEARCH_ONLY_PLATFORMS
                breakdown["в выдаче только площадки"] = BONUS_SEARCH_ONLY_PLATFORMS
                reasons.append("в выдаче только каталоги, карты и соцсети")
    else:
        reasons.append("поисковая проверка не выполнялась (нет поискового API)")

    if data.probe_performed:
        score += BONUS_PROBE_NO_DOMAIN
        breakdown["перебор вероятных доменов пуст"] = BONUS_PROBE_NO_DOMAIN
        reasons.append(f"проверено доменов-кандидатов: {data.domains_checked}, рабочего сайта нет")

    if data.social_checked:
        if data.social_profiles_found and not data.social_profiles_inspected:
            # профили есть, но прочитать их не удалось (нет VK-токена, закрытый Instagram)
            reasons.append(
                f"найдено профилей в соцсетях: {data.social_profiles_found}, "
                "но их содержимое не проверено — ссылка на сайт могла остаться незамеченной"
            )
            breakdown["соцсети найдены, но не проверены"] = 0
        elif data.social_profiles_inspected:
            if data.social_site_links:
                score += PENALTY_UNCONFIRMED_SOCIAL_LINK
                breakdown["ссылка из соцсети не подтвердилась"] = PENALTY_UNCONFIRMED_SOCIAL_LINK
                reasons.append(
                    "в соцсетях указана ссылка на сайт, но проверкой она не подтвердилась"
                )
            else:
                score += BONUS_SOCIAL_NO_SITE
                breakdown["в соцсетях нет ссылки на сайт"] = BONUS_SOCIAL_NO_SITE
                reasons.append(
                    f"проверено профилей в соцсетях: {data.social_profiles_inspected}, "
                    "ссылок на сайт нет"
                )
        else:
            score += BONUS_NO_SOCIAL_AT_ALL
            breakdown["соцсети не найдены"] = BONUS_NO_SOCIAL_AT_ALL
            reasons.append("публичных профилей в соцсетях не найдено")

    confidence = max(0, min(100, score))
    result = ConfidenceResult(status_for(confidence), confidence, "; ".join(reasons), breakdown)
    if data.notes:
        result.reason += "; " + "; ".join(data.notes)
    return result
