import pytest

from services.search_checker import build_queries, candidate_domains
from services.website_checker import DomainCheck, score_domain_match

PAGE = (
    "Ресторан «Белый Кролик» — современная русская кухня в Казани. "
    "Адрес: ул. Баумана, 15. Бронирование столов: +7 (843) 555-11-22. Меню, банкеты."
)


def check(**kwargs):
    base = dict(domain="belyykrolik.ru", reachable=True, http_status=200,
                final_domain="belyykrolik.ru", url_type="OFFICIAL_WEBSITE",
                title="Белый Кролик — ресторан в Казани")
    base.update(kwargs)
    return DomainCheck(**base)


class TestScoreDomainMatch:
    def test_full_match_is_verified(self):
        result = score_domain_match(
            check(), name="Ресторан «Белый Кролик»", phones=["+78435551122"],
            city="Казань", address="ул. Баумана, 15", page_text=PAGE,
        )
        assert result.verified
        assert result.phone_match and result.city_match and result.address_match
        assert result.score >= 90

    def test_unrelated_page_not_verified(self):
        result = score_domain_match(
            check(title="Купить шины в Москве"), name="Ресторан «Белый Кролик»",
            phones=["+78435551122"], city="Казань", address="ул. Баумана, 15",
            page_text="Интернет-магазин шин и дисков. Доставка по Москве.",
        )
        assert not result.verified
        assert result.score < 55

    def test_parked_domain_not_verified(self):
        result = score_domain_match(
            check(is_parked=True), name="Ресторан «Белый Кролик»", phones=["+78435551122"],
            city="Казань", address="ул. Баумана, 15", page_text=PAGE,
        )
        assert not result.verified
        assert "заглушка" in result.reason

    def test_unreachable_domain_scores_zero(self):
        result = score_domain_match(
            check(reachable=False), name="Белый Кролик", phones=[], city="Казань",
            address="", page_text="",
        )
        assert result.score == 0
        assert not result.verified

    def test_aggregator_page_never_counts_as_own_site(self):
        result = score_domain_match(
            check(domain="zoon.ru", final_domain="zoon.ru", url_type="DIRECTORY"),
            name="Ресторан «Белый Кролик»", phones=["+78435551122"], city="Казань",
            address="ул. Баумана, 15", page_text=PAGE,
        )
        assert not result.verified

    def test_same_name_in_another_city_is_not_confirmed(self):
        # ТЗ: нельзя считать сайтом любой домен из выдачи. Совпало только название —
        # значит это может быть одноимённое заведение в другом городе.
        weak = score_domain_match(
            check(title="Белый Кролик"), name="Белый Кролик", phones=["+78435551122"],
            city="Владивосток", address="ул. Светланская, 1",
            page_text="Белый Кролик. Ресторан. Скоро открытие нового проекта.",
        )
        assert weak.name_match >= 90
        assert not weak.phone_match and not weak.city_match
        assert not weak.verified

    def test_phone_alone_is_enough(self):
        result = score_domain_match(
            check(title="Главная"), name="Совсем Другое Имя", phones=["+78435551122"],
            city="Казань", address="ул. Баумана, 15", page_text=PAGE,
        )
        assert result.phone_match
        assert result.verified


class TestSearchQueries:
    def test_queries_follow_spec(self):
        queries = build_queries("Белый Кролик", "Казань", "Ресторан")
        assert queries[0] == '"Белый Кролик" Казань официальный сайт'
        assert queries[1] == '"Белый Кролик" Казань'
        assert "Ресторан" in queries[2]

    def test_empty_name_gives_no_queries(self):
        assert build_queries("", "Казань") == []


class TestCandidateDomains:
    def test_generates_plausible_domains(self):
        domains = candidate_domains("Белый Кролик", "Казань", 8)
        assert "belyykrolik.ru" in domains
        assert all("." in d for d in domains)
        assert len(domains) <= 8

    def test_short_or_empty_names_skipped(self):
        assert candidate_domains("", "Казань") == []
        assert candidate_domains("Ы", "Казань") == []

    def test_no_duplicates(self):
        domains = candidate_domains("Пушкинъ", "Москва", 8)
        assert len(domains) == len(set(domains))
