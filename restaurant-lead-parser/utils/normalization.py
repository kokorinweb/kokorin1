"""Нормализация телефонов, доменов, URL, названий и адресов."""
from __future__ import annotations

import re
import unicodedata
from typing import Iterable
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

# ---------------------------------------------------------------------------
# Телефоны
# ---------------------------------------------------------------------------

_PHONE_SPLIT_RE = re.compile(r"[,;/]|\bили\b|\bдоб\.?\b|\bext\.?\b", re.IGNORECASE)
_DIGITS_RE = re.compile(r"\d+")


def normalize_phone(raw: str | None) -> str | None:
    """Приводит российский номер к каноническому виду ``+7XXXXXXXXXX``.

    Возвращает None, если номер не похож на валидный российский.
    Международные номера (не +7) возвращаются как ``+<digits>``, если длина
    правдоподобна — их мы не выбрасываем, но и не переписываем.
    """
    if not raw:
        return None
    s = str(raw).strip()
    if not s:
        return None
    plus = s.lstrip().startswith("+")
    digits = "".join(_DIGITS_RE.findall(s))
    if not digits:
        return None

    if len(digits) == 11 and digits[0] in "78":
        return "+7" + digits[1:]
    if len(digits) == 10 and digits[0] == "9":
        # мобильный без кода страны
        return "+7" + digits
    if len(digits) == 10 and digits[0] in "3456780":
        # городской с кодом региона без 8/7
        return "+7" + digits
    if len(digits) == 11 and plus and digits[0] not in "78":
        return "+" + digits
    if plus and 11 <= len(digits) <= 15:
        return "+" + digits
    return None


def normalize_phones(raw: str | Iterable[str] | None) -> list[str]:
    """Разбирает строку/список с несколькими номерами в список канонических."""
    if raw is None:
        return []
    items: list[str]
    if isinstance(raw, str):
        items = [p for p in _PHONE_SPLIT_RE.split(raw) if p and p.strip()]
    else:
        items = []
        for chunk in raw:
            if not chunk:
                continue
            items.extend(p for p in _PHONE_SPLIT_RE.split(str(chunk)) if p.strip())
    out: list[str] = []
    for item in items:
        norm = normalize_phone(item)
        if norm and norm not in out:
            out.append(norm)
    return out


def phone_digits(phone: str | None) -> str:
    """Только цифры номера без кода страны — для поиска номера в тексте сайта."""
    if not phone:
        return ""
    digits = "".join(_DIGITS_RE.findall(phone))
    if len(digits) == 11 and digits[0] in "78":
        digits = digits[1:]
    return digits


# ---------------------------------------------------------------------------
# URL / домены
# ---------------------------------------------------------------------------

_TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "utm_referrer", "utm_id", "yclid", "gclid", "fbclid", "ysclid", "_openstat",
    "from", "referrer", "ref", "erid",
}

# «Публичные суффиксы», которые нужны целиком, чтобы получить регистрируемый домен.
_MULTI_LEVEL_SUFFIXES = {
    "com.ru", "net.ru", "org.ru", "pp.ru", "msk.ru", "spb.ru", "nov.ru",
    "co.uk", "org.uk", "com.ua", "co.il", "com.tr", "com.br", "co.jp",
    "github.io", "vercel.app", "netlify.app", "herokuapp.com", "web.app",
    "firebaseapp.com", "wixsite.com", "tilda.ws", "nethouse.ru", "ucoz.ru",
    "ucoz.net", "narod.ru", "wordpress.com", "blogspot.com", "livejournal.com",
    "s3.amazonaws.com", "ru.com", "azurewebsites.net", "onrender.com",
}


def _to_ascii_host(host: str) -> str:
    """IDN -> punycode (кириллические домены в .рф)."""
    try:
        return host.encode("idna").decode("ascii")
    except Exception:
        return host


def normalize_url(raw: str | None) -> str | None:
    """Канонический URL: схема, lowercase-хост без www, без utm, без якоря."""
    if not raw:
        return None
    s = str(raw).strip().strip("<>\"'")
    if not s:
        return None
    if s.startswith("//"):
        s = "https:" + s
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", s):
        if " " in s or "." not in s:
            return None
        s = "https://" + s
    try:
        parts = urlsplit(s)
    except ValueError:
        return None
    if parts.scheme not in ("http", "https"):
        return None
    host = parts.netloc.split("@")[-1]
    port = ""
    if ":" in host and not host.startswith("["):
        host, _, port = host.partition(":")
        if port in ("80", "443"):
            port = ""
    host = _to_ascii_host(host.strip().lower().rstrip("."))
    if host.startswith("www."):
        host = host[4:]
    if not host or "." not in host:
        return None
    netloc = f"{host}:{port}" if port else host
    query = urlencode(
        [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True)
         if k.lower() not in _TRACKING_PARAMS]
    )
    path = parts.path or "/"
    if path != "/" and path.endswith("/"):
        path = path.rstrip("/")
    return urlunsplit((parts.scheme, netloc, path, query, ""))


def extract_host(raw: str | None) -> str | None:
    """Хост из URL или строки-домена: lowercase, punycode, без www."""
    if not raw:
        return None
    s = str(raw).strip()
    if not s:
        return None
    if "://" not in s:
        s = "https://" + s
    try:
        host = urlsplit(s).netloc.split("@")[-1].split(":")[0]
    except ValueError:
        return None
    host = _to_ascii_host(host.strip().lower().rstrip("."))
    if host.startswith("www."):
        host = host[4:]
    if not host or "." not in host or " " in host:
        return None
    return host


def normalize_domain(raw: str | None) -> str | None:
    """Регистрируемый (canonical) домен: ``https://WWW.Cafe.Example.RU/x`` -> ``example.ru``.

    Для доменов вида ``restaurant.tilda.ws`` возвращает ``restaurant.tilda.ws``,
    потому что tilda.ws — публичный суффикс хостинга: сам поддомен и есть сайт.
    """
    host = extract_host(raw)
    if not host:
        return None
    labels = host.split(".")
    if len(labels) <= 2:
        return host
    for depth in (3, 2):
        if len(labels) > depth:
            suffix = ".".join(labels[-depth:])
            if suffix in _MULTI_LEVEL_SUFFIXES:
                return ".".join(labels[-(depth + 1):])
    two = ".".join(labels[-2:])
    if two in _MULTI_LEVEL_SUFFIXES:
        return ".".join(labels[-3:]) if len(labels) >= 3 else two
    return two


def same_domain(a: str | None, b: str | None) -> bool:
    da, db = normalize_domain(a), normalize_domain(b)
    return bool(da and db and da == db)


# ---------------------------------------------------------------------------
# Названия
# ---------------------------------------------------------------------------

_LEGAL_FORMS = [
    "общество с ограниченной ответственностью", "индивидуальный предприниматель",
    "закрытое акционерное общество", "открытое акционерное общество",
    "публичное акционерное общество", "акционерное общество",
    "ооо", "оао", "зао", "пао", "ао", "ип", "нко", "чоу", "мбу", "гбу",
    "llc", "ltd", "inc", "gmbh",
]

_TYPE_WORDS = [
    "ресторан", "кафе", "кофейня", "кофейни", "бар", "гастробар", "паб",
    "пиццерия", "суши-бар", "суши бар", "сушибар", "чайхана", "чайхона",
    "столовая", "закусочная", "бистро", "кальянная", "караоке-бар", "караоке",
    "ресторация", "траттория", "остерия", "таверна", "харчевня", "кофе-бар",
    "кондитерская", "пекарня", "бургерная", "пельменная", "хинкальная",
    "шашлычная", "блинная", "стейк-хаус", "стейк хаус", "гриль-бар",
    "restaurant", "cafe", "caffe", "coffee", "bar", "pub", "pizzeria",
    "bistro", "grill", "steak house", "steakhouse", "bakery", "sushi bar",
    "сеть ресторанов", "сеть кафе", "ресторанный комплекс", "кафе-бар",
    "кафе-кондитерская", "кафе-пекарня", "бар-ресторан", "ресторан-бар",
]

_QUOTES = "«»\"“”„‟‘’'`´"
_SPECIALS_RE = re.compile(r"[^0-9a-zA-Zа-яёА-ЯЁ ]+")
_MULTISPACE_RE = re.compile(r"\s+")


#: кириллические буквы, которые NFKD разбирает на базу + диакритику.
#: Их нужно защитить: «й» != «и», а «ё» мы отдельно сводим к «е».
_PROTECTED_CYRILLIC = {"й": "\x01", "Й": "\x02"}


def _strip_diacritics(text: str) -> str:
    """Убирает диакритику латиницы, не ломая кириллические «й» и «ё»."""
    protected = text
    for char, placeholder in _PROTECTED_CYRILLIC.items():
        protected = protected.replace(char, placeholder)
    decomposed = unicodedata.normalize("NFKD", protected)
    stripped = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    for char, placeholder in _PROTECTED_CYRILLIC.items():
        stripped = stripped.replace(placeholder, char)
    return stripped


def normalize_business_name(raw: str | None) -> str:
    """Нормализованное имя для fuzzy-сравнения.

    Убирает юрформу, кавычки, слова-типы заведения, спецсимволы, ё->е,
    схлопывает пробелы, lowercase. Если после чистки ничего не осталось —
    возвращает очищенное исходное имя (иначе «Кафе» превратится в пустую строку).
    """
    if not raw:
        return ""
    text = unicodedata.normalize("NFC", str(raw)).replace("ё", "е").replace("Ё", "Е")
    text = _strip_diacritics(text).lower()
    for q in _QUOTES:
        text = text.replace(q, " ")
    text = text.replace("&", " и ")
    text = _SPECIALS_RE.sub(" ", text)
    text = _MULTISPACE_RE.sub(" ", text).strip()

    for form in _LEGAL_FORMS:
        text = re.sub(rf"(?<!\w){re.escape(form)}(?!\w)", " ", text)
    text = _MULTISPACE_RE.sub(" ", text).strip()

    fallback = text
    for word in sorted(_TYPE_WORDS, key=len, reverse=True):
        text = re.sub(rf"(?<!\w){re.escape(word)}(?!\w)", " ", text)
    text = _MULTISPACE_RE.sub(" ", text).strip()

    return text or fallback


def name_tokens(raw: str | None, min_len: int = 3) -> list[str]:
    """Значимые токены названия для проверки совпадения на странице сайта."""
    norm = normalize_business_name(raw)
    return [t for t in norm.split() if len(t) >= min_len]


# ---------------------------------------------------------------------------
# Транслитерация (для генерации доменов-кандидатов)
# ---------------------------------------------------------------------------

_TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ж": "zh",
    "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n",
    "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f",
    "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch", "ъ": "", "ы": "y",
    "ь": "", "э": "e", "ю": "yu", "я": "ya",
}


def transliterate(text: str | None) -> str:
    if not text:
        return ""
    src = str(text).lower().replace("ё", "е")
    return "".join(_TRANSLIT.get(ch, ch) for ch in src)


def slugify(text: str | None) -> str:
    """Латинский slug без разделителей: «Кафе У Палыча» -> ``upalycha``."""
    base = transliterate(normalize_business_name(text))
    base = re.sub(r"[^a-z0-9]+", "", base)
    return base


def slugify_dashed(text: str | None) -> str:
    base = transliterate(normalize_business_name(text))
    base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
    return base


# ---------------------------------------------------------------------------
# Адреса
# ---------------------------------------------------------------------------

_ADDR_ABBR = {
    "улица": "ул", "проспект": "пр", "проспкт": "пр", "пр-т": "пр", "пр-кт": "пр",
    "переулок": "пер", "площадь": "пл", "бульвар": "б-р", "бульв": "б-р",
    "шоссе": "ш", "набережная": "наб", "дом": "д", "корпус": "к", "строение": "стр",
    "здание": "зд", "литера": "лит", "микрорайон": "мкр", "квартал": "кв-л",
    "проезд": "пр-д", "тупик": "туп", "аллея": "ал",
}


def normalize_address(raw: str | None) -> str:
    """Приводит адрес к сопоставимому виду для дедупликации."""
    if not raw:
        return ""
    text = str(raw).lower().replace("ё", "е")
    text = re.sub(r"[.,;]+", " ", text)
    text = re.sub(r"[^0-9a-zа-я\- /]+", " ", text)
    words = [_ADDR_ABBR.get(w, w) for w in text.split()]
    return _MULTISPACE_RE.sub(" ", " ".join(words)).strip()


def address_house_number(raw: str | None) -> str | None:
    """Вытаскивает номер дома — филиалы одной сети различаются именно им."""
    norm = normalize_address(raw)
    if not norm:
        return None
    matches = re.findall(
        r"(?:^|\s)(?:д\s*)?"
        r"(\d+\s*(?:к|корп|стр|с)\s*\d+[a-zа-я]?|\d+[a-zа-я]?)",
        norm,
    )
    if not matches:
        return None
    return re.sub(r"\s+", "", matches[-1])
