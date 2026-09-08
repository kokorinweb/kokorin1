"""lead_score 0–100: насколько заведение перспективно для продажи сайта."""
from __future__ import annotations

from dataclasses import dataclass, field

from database.models import Place

# --- веса ------------------------------------------------------------------

W_REVIEWS = {          # порог отзывов -> баллы
    500: 22, 200: 20, 100: 17, 50: 14, 25: 9, 10: 5,
}
W_RATING = {           # рейтинг -> баллы
    4.7: 16, 4.5: 14, 4.3: 12, 4.0: 9, 3.7: 4,
}
W_SOCIAL_ANY = 8
W_SOCIAL_MULTI = 5
W_SOCIAL_AUDIENCE = 6      # заметная аудитория в VK
W_PHONE = 8
W_EMAIL = 4
W_HOURS = 4
W_BOOKING = 7
W_DELIVERY = 5
W_PRICE_MID_PLUS = 6
W_MULTI_BRANCH = 6
W_FULL_VENUE = 8           # ресторан/гастробар/стейк-хаус — не киоск
W_MULTI_SOURCE = 5         # карточка есть в нескольких каталогах
W_GEO = 3

P_NO_PHONE = -18
P_ALMOST_NO_REVIEWS = -20
P_NO_RATING = -6
P_NO_ADDRESS = -10
P_SPARSE_CARD = -8
P_CHAIN = -12

#: категории «полноценного заведения» (там, где сайт реально нужен)
FULL_VENUE_CATEGORIES = {
    "restaurant", "gastropub", "steakhouse", "family_restaurant",
    "georgian", "italian", "asian", "sushi", "bar",
}
MID_VENUE_CATEGORIES = {"cafe", "coffee_shop", "pizzeria", "bakery_cafe"}


@dataclass
class LeadScore:
    score: int
    positives: list[str] = field(default_factory=list)
    negatives: list[str] = field(default_factory=list)

    @property
    def reason(self) -> str:
        parts = []
        if self.positives:
            parts.append("+ " + "; ".join(self.positives))
        if self.negatives:
            parts.append("− " + "; ".join(self.negatives))
        return " | ".join(parts)


def _tiered(value: float | None, table: dict) -> tuple[int, str | None]:
    if value is None:
        return 0, None
    for threshold in sorted(table, reverse=True):
        if value >= threshold:
            return table[threshold], f"{threshold}+"
    return 0, None


def score_lead(place: Place, *, exclude_chains: bool = False) -> LeadScore:
    """Считает привлекательность лида. Возвращает баллы и объяснение."""
    score = 12                      # база: заведение существует и опознано
    positives: list[str] = []
    negatives: list[str] = []

    # --- отзывы и рейтинг ---
    reviews = place.reviews_count
    points, tier = _tiered(reviews, W_REVIEWS)
    if points:
        score += points
        positives.append(f"отзывов {tier} ({reviews})")
    elif reviews is not None and reviews < 5:
        score += P_ALMOST_NO_REVIEWS
        negatives.append(f"почти нет отзывов ({reviews})")

    points, tier = _tiered(place.rating, W_RATING)
    if points:
        score += points
        positives.append(f"рейтинг {place.rating}")
    elif place.rating is None:
        score += P_NO_RATING
        negatives.append("рейтинг неизвестен")
    elif place.rating < 3.5:
        score -= 8
        negatives.append(f"низкий рейтинг {place.rating}")

    # --- контакты ---
    if place.phones:
        score += W_PHONE
        positives.append("есть телефон")
    else:
        score += P_NO_PHONE
        negatives.append("нет телефона")
    if place.email:
        score += W_EMAIL
        positives.append("есть e-mail")
    if place.working_hours:
        score += W_HOURS
        positives.append("указан график работы")

    # --- соцсети ---
    socials = place.social_urls()
    if socials:
        score += W_SOCIAL_ANY
        positives.append(f"соцсети ({len(socials)})")
        if len(socials) >= 2:
            score += W_SOCIAL_MULTI
    followers = int((place.evidence or {}).get("social_followers") or 0)
    if followers >= 1000:
        score += W_SOCIAL_AUDIENCE
        positives.append(f"аудитория в соцсетях {followers}")

    # --- каналы продаж ---
    if place.booking_url:
        score += W_BOOKING
        positives.append("есть бронирование")
    if place.delivery_url:
        score += W_DELIVERY
        positives.append("есть доставка")

    # --- сегмент и формат ---
    if place.price_level is not None and place.price_level >= 2:
        score += W_PRICE_MID_PLUS
        positives.append("средний+ ценовой сегмент")
    if place.category in FULL_VENUE_CATEGORIES:
        score += W_FULL_VENUE
        positives.append("полноценное заведение")
    elif place.category in MID_VENUE_CATEGORIES:
        score += 4
    elif place.category not in ("other_food", "bistro", ""):
        # ниша вне общепита: формат не оцениваем, но и не штрафуем
        score += 6

    if place.branch_count > 1:
        score += W_MULTI_BRANCH
        positives.append(f"несколько точек ({place.branch_count})")

    # --- полнота карточки ---
    if len(place.sources) > 1:
        score += W_MULTI_SOURCE
        positives.append(f"есть в {len(place.sources)} источниках")
    if place.latitude is not None:
        score += W_GEO
    if not place.full_address:
        score += P_NO_ADDRESS
        negatives.append("нет адреса")

    filled = sum(
        1 for value in (
            place.full_address, place.phone, place.working_hours, place.category,
            place.rating, place.reviews_count,
        ) if value
    )
    if filled <= 2:
        score += P_SPARSE_CARD
        negatives.append("карточка почти пустая (заведение выглядит заброшенным)")

    if place.is_chain:
        score += P_CHAIN
        negatives.append("сетевое заведение")
        if exclude_chains:
            score -= 25

    return LeadScore(max(0, min(100, int(round(score)))), positives, negatives)


def apply_lead_scores(places: list[Place], *, exclude_chains: bool = False) -> list[Place]:
    for place in places:
        result = score_lead(place, exclude_chains=exclude_chains)
        place.lead_score = result.score
        place.lead_score_reason = result.reason
    return places
