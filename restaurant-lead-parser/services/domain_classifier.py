"""Классификация URL: свой сайт ресторана или чужая площадка.

Ключевая функция проекта: страница ресторана на Яндекс.Картах, во ВКонтакте
или на Zoon — это НЕ собственный сайт. Только отдельный домен заведения.
"""
from __future__ import annotations

from dataclasses import dataclass

from utils.normalization import extract_host, normalize_domain

# --- типы ------------------------------------------------------------------

OFFICIAL_WEBSITE = "OFFICIAL_WEBSITE"
SOCIAL_NETWORK = "SOCIAL_NETWORK"
MAPS = "MAPS"
DIRECTORY = "DIRECTORY"
DELIVERY = "DELIVERY"
BOOKING = "BOOKING"
MULTILINK = "MULTILINK"
UNKNOWN = "UNKNOWN"

URL_TYPES = (
    OFFICIAL_WEBSITE, SOCIAL_NETWORK, MAPS, DIRECTORY, DELIVERY, BOOKING, MULTILINK, UNKNOWN,
)

#: типы, наличие которых НЕ означает наличия собственного сайта
NON_WEBSITE_TYPES = frozenset(
    {SOCIAL_NETWORK, MAPS, DIRECTORY, DELIVERY, BOOKING, MULTILINK, UNKNOWN}
)

# --- реестры доменов -------------------------------------------------------

SOCIAL_DOMAINS = {
    "vk.com", "vk.ru", "vkontakte.ru", "m.vk.com", "vk.cc",
    "t.me", "telegram.me", "telegram.dog", "telesco.pe",
    "instagram.com", "instagr.am", "ig.me",
    "facebook.com", "fb.com", "fb.me", "m.facebook.com",
    "ok.ru", "odnoklassniki.ru",
    "youtube.com", "youtu.be", "rutube.ru",
    "tiktok.com", "twitter.com", "x.com", "threads.net",
    "pinterest.com", "pinterest.ru", "linkedin.com", "dzen.ru", "zen.yandex.ru",
    "livejournal.com", "whatsapp.com", "wa.me", "viber.com",
}

MAPS_DOMAINS = {
    "yandex.ru", "yandex.com", "maps.yandex.ru", "yandex.by", "yandex.kz",
    "google.com", "google.ru", "maps.google.com", "goo.gl", "maps.app.goo.gl",
    "2gis.ru", "2gis.com", "2gis.kz", "go.2gis.com",
    "openstreetmap.org", "osm.org", "wikimapia.org", "here.com", "apple.com",
}

DIRECTORY_DOMAINS = {
    # общие каталоги и справочники
    "zoon.ru", "yell.ru", "flamp.ru", "orgpage.ru", "rusprofile.ru", "list-org.com",
    "sbis.ru", "checko.ru", "zachestnyibiznes.ru", "e-ecolog.ru", "vypiska-nalog.com",
    "bizly.ru", "spravka.ru", "moscow-business.ru", "cataloxy.ru", "tiu.ru",
    "prodoctorov.ru", "otzovik.com", "irecommend.ru", "yell.com",
    "hh.ru", "avito.ru", "youla.ru", "cian.ru", "domclick.ru",
    # ресторанные каталоги и отзывы
    "restoclub.ru", "restoran.ru", "afisha.ru", "tripadvisor.ru", "tripadvisor.com",
    "tripadvisor.co.uk", "restaurantguru.com", "menu.ru", "gdebar.ru",
    "allcafe.ru", "cafe-tut.ru", "restorating.ru", "eatout.ru", "gdeposhet.ru",
    "kudago.com", "relax.by", "the-village.ru", "gastronom.ru", "vsemenu.ru",
    "spb.restoran.ru", "restoranoff.ru", "hipdir.com", "menuonline.ru",
    "ru.foursquare.com", "foursquare.com", "swarmapp.com", "wikipedia.org",
    "vc.ru", "rbc.ru", "kommersant.ru", "lenta.ru", "gazeta.ru", "ria.ru",
    "blanki-org.ru", "companies.rbc.ru", "b2b-broker.ru", "moskva.spr.ru", "spr.ru",
}

DELIVERY_DOMAINS = {
    "eda.yandex.ru", "eda.yandex", "market-delivery.yandex.ru", "delivery-club.ru",
    "delivery.yandex.ru", "sbermarket.ru", "kuper.ru", "samokat.ru", "vkusvill.ru",
    "broniboy.com", "chibbis.ru", "edostav.ru", "yandex.eda", "market.yandex.ru",
    "ozon.ru", "wildberries.ru", "sushi-master.ru",
}

BOOKING_DOMAINS = {
    "leclick.ru", "gettable.ru", "restoplace.ws", "restoplace.cc", "reserve.rest",
    "tomesto.ru", "afisha-restorany.ru", "booking.com", "opentable.com",
    "quandoo.ru", "resto.ru", "bronirui.ru", "letsgo.rest", "clientix.ru",
    "yclients.com", "n1348767.yclients.com", "dikidi.net", "dikidi.ru",
    "restopass.ru", "eatery.club",
}

MULTILINK_DOMAINS = {
    "taplink.cc", "taplink.ru", "taplink.at", "linktr.ee", "lnk.bio", "linkin.bio",
    "beacons.ai", "linkpop.com", "bio.link", "milkshake.app", "hipolink.me",
    "mssg.me", "vk.link", "linktree.com", "solo.to", "campsite.bio", "znaet.link",
    "clck.ru", "bit.ly", "clck.yandex.ru", "vk.me", "cutt.ly", "tinyurl.com",
}

#: конструкторы сайтов: поддомен на них — это уже собственный сайт заведения,
#: но корневой домен конструктора сайтом ресторана не является
SITE_BUILDER_DOMAINS = {
    "tilda.ws", "tildacdn.com", "wixsite.com", "wix.com", "ukit.me", "nethouse.ru",
    "ucoz.ru", "ucoz.net", "a5.ru", "megagroup.ru", "reg.site", "webnode.ru",
    "site123.me", "jimdosite.com", "weebly.com", "readymag.com", "craftum.com",
    "creatium.site", "flexbe.ru", "platformalp.ru", "b12.io", "narod.ru",
    "github.io", "vercel.app", "netlify.app", "onrender.com", "pages.dev",
    "wordpress.com", "blogspot.com", "notion.site", "google.com",
}

#: домены-заглушки регистраторов и парковок
PARKING_DOMAINS = {
    "reg.ru", "nic.ru", "timeweb.ru", "beget.com", "sedo.com", "afternic.com",
    "dan.com", "hostland.ru", "sprinthost.ru", "parkingcrew.net", "bodis.com",
}

_ALL_KNOWN = {
    **{d: SOCIAL_NETWORK for d in SOCIAL_DOMAINS},
    **{d: MAPS for d in MAPS_DOMAINS},
    **{d: DIRECTORY for d in DIRECTORY_DOMAINS},
    **{d: DELIVERY for d in DELIVERY_DOMAINS},
    **{d: BOOKING for d in BOOKING_DOMAINS},
    **{d: MULTILINK for d in MULTILINK_DOMAINS},
}

# специальные пути внутри крупных доменов
_YANDEX_PATH_HINTS = {
    "/maps": MAPS, "/profile": MAPS, "/org": MAPS, "/sprav": MAPS, "/search": MAPS,
}


@dataclass
class UrlClass:
    url: str
    type: str
    domain: str | None
    reason: str

    @property
    def is_own_website(self) -> bool:
        return self.type == OFFICIAL_WEBSITE


def _match_registry(host: str, domain: str) -> tuple[str, str] | None:
    for candidate in (host, domain):
        if candidate in _ALL_KNOWN:
            return _ALL_KNOWN[candidate], f"домен в реестре ({candidate})"
    # поддомены известных площадок: m.vk.com, spb.restoran.ru и т.п.
    parts = host.split(".")
    for i in range(1, len(parts) - 1):
        suffix = ".".join(parts[i:])
        if suffix in _ALL_KNOWN:
            return _ALL_KNOWN[suffix], f"поддомен площадки ({suffix})"
    return None


def classify_url(url: str | None) -> UrlClass:
    """Определяет тип ссылки.

    Возвращает :class:`UrlClass` с полями ``type`` (одно из ``URL_TYPES``),
    ``domain`` (canonical) и ``reason`` (человекочитаемое объяснение).
    """
    if not url or not str(url).strip():
        return UrlClass(url or "", UNKNOWN, None, "пустая ссылка")

    raw = str(url).strip()
    host = extract_host(raw)
    domain = normalize_domain(raw)
    if not host or not domain:
        return UrlClass(raw, UNKNOWN, None, "не удалось разобрать домен")

    lowered = raw.lower()
    path = ""
    if "://" in lowered:
        rest = lowered.split("://", 1)[1]
        path = "/" + rest.partition("/")[2] if "/" in rest else "/"
    else:
        path = "/" + raw.partition("/")[2] if "/" in raw else "/"

    # 1. точечные правила для больших доменов
    if domain in ("yandex.ru", "yandex.com", "ya.ru"):
        if path.startswith("/maps") or "/maps" in lowered or host.startswith("maps."):
            return UrlClass(raw, MAPS, domain, "Яндекс.Карты")
        if "eda.yandex" in host:
            return UrlClass(raw, DELIVERY, domain, "Яндекс.Еда")
        for prefix, kind in _YANDEX_PATH_HINTS.items():
            if path.startswith(prefix):
                return UrlClass(raw, kind, domain, "сервис Яндекса")
        return UrlClass(raw, MAPS, domain, "сервис Яндекса")
    if domain in ("google.com", "google.ru") and ("/maps" in path or host.startswith("maps.")):
        return UrlClass(raw, MAPS, domain, "Google Maps")

    # 2. реестры
    matched = _match_registry(host, domain)
    if matched:
        kind, reason = matched
        return UrlClass(raw, kind, domain, reason)

    # 3. конструкторы сайтов
    for builder in SITE_BUILDER_DOMAINS:
        if domain == builder or host == builder:
            return UrlClass(raw, DIRECTORY, domain, f"корень конструктора сайтов ({builder})")
        if host.endswith("." + builder):
            # project.tilda.ws — это самостоятельный сайт заведения
            return UrlClass(raw, OFFICIAL_WEBSITE, domain, f"сайт на конструкторе ({builder})")

    # 4. парковки/регистраторы
    if domain in PARKING_DOMAINS:
        return UrlClass(raw, UNKNOWN, domain, "страница регистратора/парковка домена")

    # 5. эвристики по имени домена
    if any(token in domain for token in ("delivery", "dostavka-sushi", "edadeal")):
        return UrlClass(raw, DELIVERY, domain, "домен похож на агрегатор доставки")
    if domain.split(".")[0] in ("blog", "wiki", "news", "forum"):
        return UrlClass(raw, DIRECTORY, domain, "информационный ресурс")

    return UrlClass(raw, OFFICIAL_WEBSITE, domain, "отдельный домен, не найден в реестрах площадок")


def classify(url: str | None) -> str:
    """Короткая форма: только тип."""
    return classify_url(url).type


def is_own_website(url: str | None) -> bool:
    return classify_url(url).is_own_website


def social_network_of(url: str | None) -> str | None:
    """vk / telegram / instagram / facebook / ok / youtube / tiktok или None."""
    host = extract_host(url)
    if not host:
        return None
    mapping = {
        "vk.com": "vk", "vk.ru": "vk", "vkontakte.ru": "vk", "m.vk.com": "vk",
        "t.me": "telegram", "telegram.me": "telegram", "telegram.dog": "telegram",
        "instagram.com": "instagram", "instagr.am": "instagram",
        "facebook.com": "facebook", "fb.com": "facebook", "m.facebook.com": "facebook",
        "ok.ru": "ok", "odnoklassniki.ru": "ok",
        "youtube.com": "youtube", "youtu.be": "youtube",
        "tiktok.com": "tiktok",
    }
    if host in mapping:
        return mapping[host]
    domain = normalize_domain(url)
    return mapping.get(domain or "")
