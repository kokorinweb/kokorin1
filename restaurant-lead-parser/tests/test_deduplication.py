import pytest

from database.models import Place
from services.deduplicator import deduplicate, is_same_place, merge_places, place_key
from utils.normalization import normalize_address, normalize_business_name


def make(name, *, city="Казань", address="", lat=None, lon=None, phone="",
         source="osm", website="", rating=None, reviews=None, domains=()):
    place = Place(
        name=name,
        normalized_name=normalize_business_name(name),
        city=city,
        full_address=address,
        normalized_address=normalize_address(address),
        latitude=lat,
        longitude=lon,
        phone=phone,
        source=source,
        sources=[source],
        source_ids=[f"{source}:{name}"],
        website_from_source=website,
        detected_domains=list(domains),
        rating=rating,
        reviews_count=reviews,
    )
    place.place_key = place_key(place)
    return place


class TestIsSamePlace:
    def test_same_name_same_point(self):
        a = make("Кафе «Белый Кролик»", address="ул. Баумана, 15", lat=55.7900, lon=49.1220)
        b = make("Белый Кролик", address="улица Баумана, д. 15", lat=55.7901, lon=49.1221,
                 source="dgis")
        assert is_same_place(a, b).same

    def test_same_phone_different_spelling(self):
        a = make("Ресторан Пушкинъ", phone="+78435551122", lat=55.79, lon=49.12)
        b = make('ООО "Пушкин"', phone="+78435551122", lat=55.7902, lon=49.1201, source="yandex")
        assert is_same_place(a, b).same

    def test_shared_domain_and_similar_name(self):
        a = make("Кафе Марио", domains=["mario.ru"], lat=55.79, lon=49.12)
        b = make("Пиццерия Марио", domains=["mario.ru"], lat=55.7901, lon=49.1202, source="dgis")
        decision = is_same_place(a, b)
        assert decision.same
        assert "домен" in decision.reason

    def test_shared_domain_but_different_branches_still_split(self):
        a = make("Марио", address="ул. Баумана, 15", domains=["mario.ru"], lat=55.79, lon=49.12)
        b = make("Марио", address="пр. Победы, 141", domains=["mario.ru"], lat=55.75, lon=49.20)
        assert not is_same_place(a, b).same

    def test_different_branches_of_the_same_chain_are_not_merged(self):
        a = make("Тюбетей", address="ул. Баумана, 15", lat=55.7900, lon=49.1220)
        b = make("Тюбетей", address="пр. Победы, 141", lat=55.7500, lon=49.2000)
        decision = is_same_place(a, b)
        assert not decision.same
        assert "филиал" in decision.reason

    def test_same_name_different_house_not_merged(self):
        a = make("Тюбетей", address="ул. Баумана, 15")
        b = make("Тюбетей", address="ул. Баумана, 44")
        assert not is_same_place(a, b).same

    def test_different_cities_not_merged(self):
        a = make("Тюбетей", city="Казань", lat=55.79, lon=49.12)
        b = make("Тюбетей", city="Москва", lat=55.79, lon=49.12)
        assert not is_same_place(a, b).same

    def test_unrelated_places_not_merged(self):
        a = make("Белый Кролик", lat=55.79, lon=49.12)
        b = make("Чёрный Лебедь", lat=55.7901, lon=49.1201)
        assert not is_same_place(a, b).same


class TestMerge:
    def test_merge_keeps_richest_data(self):
        a = make("Белый Кролик", address="ул. Баумана, 15", lat=55.79, lon=49.12,
                 phone="+78435551122", source="osm")
        b = make("Белый Кролик", address="г. Казань, ул. Баумана, д. 15", lat=55.7901,
                 lon=49.1201, phone="+79170001122", source="dgis", rating=4.6, reviews=320)
        merged = merge_places(a, b, priorities={"osm": 20, "dgis": 35})
        assert merged.rating == 4.6
        assert merged.reviews_count == 320
        assert set(merged.phones) == {"+78435551122", "+79170001122"}
        assert set(merged.sources) >= {"osm", "dgis"}
        assert len(merged.full_address) >= len("ул. Баумана, 15")


class TestDeduplicate:
    def test_collapses_duplicates_across_sources(self):
        places = [
            make("Кафе «Белый Кролик»", address="ул. Баумана, 15", lat=55.7900, lon=49.1220),
            make("Белый Кролик", address="улица Баумана, 15", lat=55.7901, lon=49.1221,
                 source="dgis"),
            make("Белый Кролик", address="ул. Баумана, 15", lat=55.7900, lon=49.1220,
                 source="yandex"),
        ]
        unique, merged = deduplicate(places, priorities={"osm": 20, "dgis": 35, "yandex": 40})
        assert len(unique) == 1
        assert merged == 2
        assert set(unique[0].sources) == {"osm", "dgis", "yandex"}

    def test_keeps_separate_branches(self):
        places = [
            make("Тюбетей", address="ул. Баумана, 15", lat=55.7900, lon=49.1220),
            make("Тюбетей", address="пр. Победы, 141", lat=55.7500, lon=49.2000),
            make("Тюбетей", address="ул. Кремлёвская, 8", lat=55.7960, lon=49.1080),
        ]
        unique, merged = deduplicate(places)
        assert len(unique) == 3
        assert merged == 0

    def test_empty_input(self):
        assert deduplicate([]) == ([], 0)

    def test_large_batch_is_linear_enough(self):
        places = [
            make(f"Кафе {i}", address=f"ул. Тестовая, {i}", lat=55.0 + i * 0.01, lon=49.0)
            for i in range(300)
        ]
        unique, merged = deduplicate(places)
        assert len(unique) == 300
        assert merged == 0
