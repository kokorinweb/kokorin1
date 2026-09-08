import pytest

from services.interactive import format_lead
from database.models import Place
from sources.categories import exclusion_reason
from sources.niches import FOOD_NICHE, custom_niche, resolve_niche
from sources.osm_overpass import OverpassSource


class TestResolveNiche:
    @pytest.mark.parametrize("text,key", [
        ("кофейни", "coffee"),
        ("кофейня", "coffee"),
        ("барбершопы", "barbershop"),
        ("парикмахерская", "barbershop"),
        ("стоматология", "dentist"),
        ("зубной", "dentist"),
        ("автосервисы", "auto_repair"),
        ("салон красоты", "beauty"),
        ("отели", "hotel"),
        ("юристы", "law"),
        ("цветы", "flowers"),
    ])
    def test_known_niches(self, text, key):
        assert resolve_niche(text).key == key

    @pytest.mark.parametrize("text", ["", "   ", None, "рестораны", "общепит"])
    def test_empty_or_food_gives_food_niche(self, text):
        niche = resolve_niche(text)
        assert niche.key == "food"
        assert niche.food

    def test_fuzzy_phrase(self):
        assert resolve_niche("ищу салоны красоты в городе").key == "beauty"

    def test_unknown_becomes_custom(self):
        niche = resolve_niche("подологи")
        assert niche.custom
        assert niche.key == "custom"
        assert "подологи" in niche.search_terms

    def test_custom_niche_escapes_input(self):
        # кавычки и скобки не должны попасть в Overpass-запрос
        niche = custom_niche('барбер"]["shop"="supermarket')
        assert '"' not in niche.osm_filters[0].replace('["name"~"', "").replace('",i]', "")
        assert "supermarket" in niche.osm_filters[0]  # осталось безобидным текстом

    def test_short_custom_input_has_no_osm_filter(self):
        assert custom_niche("аб").osm_filters == ()


class TestOverpassQueryForNiche:
    def test_niche_filters_used(self):
        query = OverpassSource._build_query(
            area_id=3600000001, bbox=None, filters=resolve_niche("стоматология").osm_filters
        )
        assert '["amenity"="dentist"]' in query
        assert "restaurant" not in query

    def test_food_is_default_when_no_filters(self):
        query = OverpassSource._build_query(area_id=None, bbox=(55.0, 49.0, 56.0, 50.0), filters=())
        assert "restaurant" in query and "cafe" in query

    def test_name_always_required(self):
        query = OverpassSource._build_query(
            area_id=3600000001, bbox=None, filters=resolve_niche("автомойки").osm_filters
        )
        assert '["name"]' in query


class TestNicheAwareExclusions:
    def test_food_stopwords_do_not_apply_to_other_niches(self):
        assert exclusion_reason(name="Аптека Вита", food=True) is not None
        assert exclusion_reason(name="Аптека Вита", food=False) is None
        assert exclusion_reason(name="Автомойка Блеск", food=False) is None

    def test_generic_stopwords_apply_everywhere(self):
        for food in (True, False):
            assert exclusion_reason(name="Киоск у дома", food=food) is not None
            assert exclusion_reason(name="Салон (закрыто)", food=food) is not None

    def test_generic_names_rejected_in_any_niche(self):
        assert exclusion_reason(name="Салон", food=False) is not None
        assert exclusion_reason(name="Стоматология", food=False) is not None
        assert exclusion_reason(name="Стоматология Улыбка", food=False) is None


class TestLeadCard:
    def test_card_contains_contacts(self):
        place = Place(
            name="Барбершоп «Бородач»", full_address="ул. Баумана, 15",
            phone="+78435551122", vk_url="https://vk.com/borodach",
            rating=4.8, reviews_count=412, lead_score=83, website_confidence=85,
            source_url="https://osm.org/node/1",
        )
        card = format_lead(place, 1)
        assert "Бородач" in card
        assert "+78435551122" in card
        assert "vk.com/borodach" in card
        assert "lead 83" in card and "85%" in card
        assert "ул. Баумана, 15" in card

    def test_card_survives_missing_fields(self):
        card = format_lead(Place(name="Без контактов"), 7)
        assert "Без контактов" in card
        assert card.startswith("  7.")
