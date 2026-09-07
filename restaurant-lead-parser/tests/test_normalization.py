import pytest

from utils.normalization import (
    address_house_number, extract_host, name_tokens, normalize_address,
    normalize_business_name, normalize_domain, normalize_phone, normalize_phones,
    normalize_url, phone_digits, slugify,
)


class TestNormalizePhone:
    @pytest.mark.parametrize("raw", [
        "+7 (843) 555-11-22", "8 843 555 11 22", "88435551122", "7-843-555-11-22",
        "+7(843)5551122", "8 (843) 555−11−22",
    ])
    def test_russian_variants_collapse_to_one_form(self, raw):
        assert normalize_phone(raw) == "+78435551122"

    def test_mobile_without_country_code(self):
        assert normalize_phone("9161234567") == "+79161234567"

    def test_city_number_without_country_code(self):
        assert normalize_phone("8432221100") == "+78432221100"

    def test_international_kept_as_is(self):
        assert normalize_phone("+380 44 123 45 67") == "+380441234567"

    @pytest.mark.parametrize("raw", [None, "", "   ", "нет телефона", "12", "abc"])
    def test_garbage_returns_none(self, raw):
        assert normalize_phone(raw) is None

    def test_multiple_phones_split_and_deduped(self):
        result = normalize_phones("+7 843 555-11-22, 8(843)555-11-22; +7 917 000 11 22")
        assert result == ["+78435551122", "+79170001122"]

    def test_phone_digits_strips_country_code(self):
        assert phone_digits("+78435551122") == "8435551122"


class TestNormalizeDomain:
    @pytest.mark.parametrize("raw,expected", [
        ("https://WWW.Example.RU/menu?utm_source=vk", "example.ru"),
        ("example.ru", "example.ru"),
        ("http://sub.example.ru", "example.ru"),
        ("HTTPS://Example.COM:443/", "example.com"),
        ("https://cafe.example.com.ru/", "example.com.ru"),
        ("https://mycafe.tilda.ws/page", "mycafe.tilda.ws"),
        ("https://www.кафе.рф", "xn--80akn5b.xn--p1ai"),
    ])
    def test_canonical_domain(self, raw, expected):
        assert normalize_domain(raw) == expected

    @pytest.mark.parametrize("raw", [None, "", "не url", "  "])
    def test_garbage_returns_none(self, raw):
        assert normalize_domain(raw) is None

    def test_extract_host_keeps_subdomain(self):
        assert extract_host("https://www.menu.example.ru/x") == "menu.example.ru"

    def test_normalize_url_drops_tracking_and_www(self):
        assert normalize_url("http://www.Example.ru/menu/?utm_source=a&page=2&yclid=9") == \
            "http://example.ru/menu?page=2"

    def test_normalize_url_adds_scheme(self):
        assert normalize_url("example.ru/menu") == "https://example.ru/menu"


class TestNormalizeBusinessName:
    @pytest.mark.parametrize("raw,expected", [
        ('ООО "Ресторан Пушкинъ"', "пушкинъ"),
        ("Кафе «У Палыча»", "у палыча"),
        ("Ресторан  Белый   Кролик!!!", "белый кролик"),
        ("Coffee Bean Cafe", "bean"),
        ("ИП Иванов - Пиццерия Марио", "иванов марио"),
        ("Гастробар ЁЛКА", "елка"),
    ])
    def test_cleanup(self, raw, expected):
        assert normalize_business_name(raw) == expected

    def test_type_word_only_name_is_not_emptied(self):
        # «Кафе» без бренда не должно превращаться в пустую строку
        assert normalize_business_name("Кафе") == "кафе"

    def test_empty_input(self):
        assert normalize_business_name(None) == ""
        assert normalize_business_name("") == ""

    def test_tokens_skip_short_words(self):
        assert name_tokens("Ресторан Белый Кролик") == ["белый", "кролик"]

    def test_slugify_transliterates(self):
        assert slugify("Кафе «Белый Кролик»") == "belyykrolik"


class TestNormalizeAddress:
    def test_abbreviations_unified(self):
        left = normalize_address("г. Казань, улица Баумана, дом 15")
        right = normalize_address("Казань, ул Баумана, д 15")
        assert left.endswith("ул баумана д 15")
        assert right.endswith("ул баумана д 15")

    def test_house_number_extracted(self):
        assert address_house_number("Казань, ул. Баумана, д. 15к2") == "15к2"
        assert address_house_number("Казань, ул. Баумана, 7") == "7"
        assert address_house_number("Казань") is None
