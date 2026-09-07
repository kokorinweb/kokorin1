import pytest

from services.domain_classifier import (
    BOOKING, DELIVERY, DIRECTORY, MAPS, MULTILINK, OFFICIAL_WEBSITE, SOCIAL_NETWORK, UNKNOWN,
    classify, classify_url, is_own_website, social_network_of,
)


class TestClassifyUrl:
    @pytest.mark.parametrize("url", [
        "https://vk.com/beliykrolik",
        "https://m.vk.com/club123",
        "https://t.me/mycafe",
        "https://www.instagram.com/mycafe/",
        "https://facebook.com/mycafe",
        "https://ok.ru/mycafe",
    ])
    def test_social_networks(self, url):
        assert classify(url) == SOCIAL_NETWORK

    @pytest.mark.parametrize("url", [
        "https://yandex.ru/maps/org/belyy_krolik/1234567/",
        "https://2gis.ru/kazan/firm/70000001006312345",
        "https://www.google.com/maps/place/Cafe",
        "https://maps.app.goo.gl/abcdef",
        "https://www.openstreetmap.org/node/123",
    ])
    def test_maps(self, url):
        assert classify(url) == MAPS

    @pytest.mark.parametrize("url", [
        "https://zoon.ru/kazan/restaurants/kafe_x/",
        "https://www.tripadvisor.ru/Restaurant_Review-g298484.html",
        "https://restoclub.ru/spb/place/kafe",
        "https://yell.ru/moscow/com/kafe_1234567/",
        "https://www.restaurantguru.com/Cafe-Kazan",
        "https://flamp.ru/firm/kafe-123",
    ])
    def test_directories(self, url):
        assert classify(url) == DIRECTORY

    @pytest.mark.parametrize("url", [
        "https://eda.yandex.ru/kazan/r/belyy_krolik",
        "https://www.delivery-club.ru/srv/kafe",
        "https://chibbis.ru/kazan/restaurant",
    ])
    def test_delivery(self, url):
        assert classify(url) == DELIVERY

    @pytest.mark.parametrize("url", [
        "https://leclick.ru/place/kafe",
        "https://tomesto.ru/restaurant-kafe",
        "https://gettable.ru/msk/restaurant",
    ])
    def test_booking(self, url):
        assert classify(url) == BOOKING

    @pytest.mark.parametrize("url", [
        "https://taplink.cc/mycafe",
        "https://linktr.ee/mycafe",
        "https://bio.link/mycafe",
    ])
    def test_multilink(self, url):
        assert classify(url) == MULTILINK

    @pytest.mark.parametrize("url", [
        "https://belyykrolik.ru",
        "http://www.whiterabbitmoscow.ru/menu",
        "https://xn--80akn5b.xn--p1ai",
        "https://mycafe.tilda.ws/",
        "https://kafe-mario.com",
    ])
    def test_official_websites(self, url):
        assert classify(url) == OFFICIAL_WEBSITE
        assert is_own_website(url)

    def test_site_builder_root_is_not_a_website(self):
        assert classify("https://tilda.ws") == DIRECTORY
        assert not is_own_website("https://tilda.ws")

    def test_registrar_parking_is_unknown(self):
        assert classify("https://reg.ru") == UNKNOWN

    @pytest.mark.parametrize("url", [None, "", "   ", "не ссылка", "javascript:void(0)"])
    def test_garbage(self, url):
        assert classify(url) == UNKNOWN

    def test_result_carries_domain_and_reason(self):
        result = classify_url("https://WWW.Belyy-Krolik.RU/menu")
        assert result.domain == "belyy-krolik.ru"
        assert result.type == OFFICIAL_WEBSITE
        assert result.reason

    def test_aggregator_page_is_not_a_website(self):
        # ключевая проверка ТЗ: карточка на агрегаторе ≠ собственный сайт
        for url in ("https://zoon.ru/kazan/x/", "https://vk.com/x", "https://taplink.cc/x"):
            assert not is_own_website(url)


class TestSocialNetworkOf:
    @pytest.mark.parametrize("url,network", [
        ("https://vk.com/x", "vk"),
        ("https://t.me/x", "telegram"),
        ("https://instagram.com/x", "instagram"),
        ("https://ok.ru/x", "ok"),
        ("https://belyykrolik.ru", None),
    ])
    def test_detection(self, url, network):
        assert social_network_of(url) == network
