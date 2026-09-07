import pytest

from database.models import Place
from services.chain_detector import annotate_chains, chain_verdict
from services.lead_scorer import apply_lead_scores, score_lead


def make(**kwargs):
    defaults = dict(
        name="Ресторан Белый Кролик",
        category="restaurant",
        city="Казань",
        full_address="ул. Баумана, 15",
        phone="+78435551122",
        working_hours="пн-вс 10:00-23:00",
        rating=4.6,
        reviews_count=320,
        sources=["osm", "dgis"],
        latitude=55.79,
        longitude=49.12,
    )
    defaults.update(kwargs)
    return Place(**defaults)


class TestLeadScore:
    def test_strong_lead_scores_high(self):
        place = make(vk_url="https://vk.com/x", telegram_url="https://t.me/x",
                     booking_url="https://leclick.ru/x", delivery_url="https://eda.yandex.ru/x",
                     price_level=3)
        result = score_lead(place)
        assert result.score >= 85
        assert "есть телефон" in result.reason

    def test_weak_lead_scores_low(self):
        place = make(rating=None, reviews_count=1, phone="", working_hours="",
                     full_address="", sources=["osm"], latitude=None, longitude=None)
        result = score_lead(place)
        assert result.score <= 30
        assert "нет телефона" in result.reason

    def test_more_reviews_scores_higher(self):
        few = score_lead(make(reviews_count=12)).score
        many = score_lead(make(reviews_count=600)).score
        assert many > few

    def test_higher_rating_scores_higher(self):
        low = score_lead(make(rating=3.8)).score
        high = score_lead(make(rating=4.8)).score
        assert high > low

    def test_missing_phone_penalised(self):
        with_phone = score_lead(make()).score
        without = score_lead(make(phone="")).score
        assert without < with_phone - 15

    def test_full_venue_beats_generic(self):
        restaurant = score_lead(make(category="restaurant")).score
        other = score_lead(make(category="other_food")).score
        assert restaurant > other

    def test_chain_penalised_more_when_excluded(self):
        chain = make(is_chain=True)
        assert score_lead(chain, exclude_chains=True).score < score_lead(chain).score

    def test_score_bounds(self):
        maxed = make(reviews_count=100000, rating=5.0, price_level=4, branch_count=9,
                     vk_url="https://vk.com/x", telegram_url="https://t.me/x",
                     instagram_url="https://instagram.com/x",
                     booking_url="https://leclick.ru/x", delivery_url="https://eda.yandex.ru/x",
                     email="a@b.ru", evidence={"social_followers": 50000})
        assert 0 <= score_lead(maxed).score <= 100
        empty = Place(name="X")
        assert 0 <= score_lead(empty).score <= 100

    def test_apply_writes_back_to_places(self):
        places = [make(), make(reviews_count=2, rating=None)]
        apply_lead_scores(places)
        assert places[0].lead_score > places[1].lead_score
        assert all(p.lead_score_reason for p in places)

    def test_social_audience_bonus(self):
        quiet = make(vk_url="https://vk.com/x")
        loud = make(vk_url="https://vk.com/x", evidence={"social_followers": 12000})
        assert score_lead(loud).score > score_lead(quiet).score


class TestChainDetector:
    def test_known_federal_chain(self):
        is_chain, reason = chain_verdict(make(name="Шоколадница"))
        assert is_chain
        assert "сет" in reason

    def test_independent_place_is_not_a_chain(self):
        is_chain, _ = chain_verdict(make(name="Ресторан Белый Кролик"))
        assert not is_chain

    def test_brand_id_marks_chain(self):
        place = make(name="Локальная Пекарня", evidence={"brand_id": "Q123"})
        is_chain, reason = chain_verdict(place)
        assert is_chain
        assert "бренд" in reason

    def test_many_same_name_points_detected_as_chain(self):
        places = [make(name="Тюбетей", full_address=f"ул. Тестовая, {i}") for i in range(7)]
        annotate_chains(places, threshold=6)
        assert all(p.is_chain for p in places)
        assert places[0].branch_count == 7

    def test_few_points_stay_independent(self):
        places = [make(name="Тюбетей", full_address=f"ул. Тестовая, {i}") for i in range(3)]
        annotate_chains(places, threshold=6)
        assert not any(p.is_chain for p in places)
