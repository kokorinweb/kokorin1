import pytest

from database.models import (
    CHECK_FAILED, HAS_WEBSITE, NO_WEBSITE_HIGH_CONFIDENCE,
    NO_WEBSITE_MEDIUM_CONFIDENCE, UNCERTAIN,
)
from services.confidence import ConfidenceInput, compute_confidence, status_for


def full_checks(**overrides):
    data = dict(
        search_performed=True, search_hits=8, search_found_own_domain=False,
        search_only_platforms=True, probe_performed=True, domains_checked=6,
        social_checked=True, social_profiles_found=2, social_profiles_inspected=2,
        social_site_links=0,
    )
    data.update(overrides)
    return ConfidenceInput(**data)


class TestConfidence:
    def test_all_checks_negative_gives_100(self):
        result = compute_confidence(full_checks())
        assert result.confidence == 100
        assert result.status == NO_WEBSITE_HIGH_CONFIDENCE

    def test_socials_found_without_site_link_is_at_least_90(self):
        result = compute_confidence(full_checks(probe_performed=False, domains_checked=0))
        assert result.confidence >= 90
        assert result.status == NO_WEBSITE_HIGH_CONFIDENCE

    def test_catalog_only_is_medium(self):
        result = compute_confidence(ConfidenceInput())
        assert result.confidence == 70
        assert result.status == NO_WEBSITE_MEDIUM_CONFIDENCE

    def test_no_search_provider_still_reaches_high_with_probe_and_socials(self):
        result = compute_confidence(
            ConfidenceInput(
                probe_performed=True, domains_checked=6,
                social_checked=True, social_profiles_found=1, social_profiles_inspected=1,
            )
        )
        assert result.confidence == 85
        assert result.status == NO_WEBSITE_HIGH_CONFIDENCE

    def test_verified_website_wins_over_everything(self):
        result = compute_confidence(full_checks(verified_domain="belyykrolik.ru",
                                                verified_source="поиск"))
        assert result.status == HAS_WEBSITE
        assert result.confidence == 0
        assert "belyykrolik.ru" in result.reason

    def test_catalog_domain_means_has_website(self):
        result = compute_confidence(
            ConfidenceInput(catalog_website="https://x.ru", catalog_website_is_own_domain=True)
        )
        assert result.status == HAS_WEBSITE

    def test_dead_catalog_domain_is_uncertain_not_a_lead(self):
        result = compute_confidence(
            ConfidenceInput(
                catalog_website="https://x.ru",
                catalog_website_is_own_domain=True,
                catalog_domain_dead=True,
            )
        )
        assert result.status == UNCERTAIN
        assert result.confidence < 85

    def test_search_found_domain_but_unverified_lowers_confidence(self):
        with_domain = compute_confidence(full_checks(search_found_own_domain=True))
        without = compute_confidence(full_checks())
        assert with_domain.confidence < without.confidence
        assert with_domain.confidence < 85

    def test_failed_checks(self):
        result = compute_confidence(
            ConfidenceInput(check_failed=True, failure_reason="провайдер вернул 403")
        )
        assert result.status == CHECK_FAILED
        assert "403" in result.reason

    def test_profiles_found_but_not_inspected_gives_no_bonus(self):
        # профиль есть, но прочитать его не удалось — утверждать «ссылки нет» нельзя
        blind = compute_confidence(full_checks(social_profiles_inspected=0))
        seen = compute_confidence(full_checks())
        assert blind.confidence < seen.confidence

    def test_confidence_never_exceeds_100(self):
        result = compute_confidence(full_checks(social_profiles_found=99,
                                                social_profiles_inspected=99, search_hits=999))
        assert 0 <= result.confidence <= 100

    def test_reason_is_human_readable(self):
        result = compute_confidence(full_checks())
        assert "в карточке источника сайт не указан" in result.reason
        assert result.breakdown


@pytest.mark.parametrize("value,expected", [
    (100, NO_WEBSITE_HIGH_CONFIDENCE),
    (85, NO_WEBSITE_HIGH_CONFIDENCE),
    (84, NO_WEBSITE_MEDIUM_CONFIDENCE),
    (70, NO_WEBSITE_MEDIUM_CONFIDENCE),
    (69, UNCERTAIN),
    (0, UNCERTAIN),
])
def test_status_thresholds(value, expected):
    assert status_for(value) == expected
