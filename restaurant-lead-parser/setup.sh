#!/usr/bin/env bash
# Разовая установка: venv, зависимости, .env, проверка ключей.
# Запуск:  ./setup.sh
set -euo pipefail
cd "$(dirname "$0")"

PY=""
for candidate in python3.12 python3.11 python3; do
    if command -v "$candidate" >/dev/null 2>&1; then
        version=$("$candidate" -c 'import sys;print("%d.%d"%sys.version_info[:2])' 2>/dev/null || echo 0.0)
        major=${version%%.*}; minor=${version##*.}
        if [ "$major" -eq 3 ] && [ "$minor" -ge 11 ]; then PY="$candidate"; break; fi
    fi
done
if [ -z "$PY" ]; then
    echo "Нужен Python 3.11 или новее. Установи его и запусти скрипт снова." >&2
    exit 1
fi
echo "==> Python: $($PY --version)"

if [ ! -d .venv ]; then
    echo "==> Создаю виртуальное окружение .venv"
    "$PY" -m venv .venv
fi

echo "==> Ставлю зависимости"
./.venv/bin/pip install --quiet --upgrade pip
./.venv/bin/pip install --quiet -r requirements.txt

if [ ! -f .env ]; then
    cp .env.example .env
    echo ""
    echo "==> Создан файл .env"
    echo "    Впиши в него свой контакт в OSM_USER_AGENT и ключи API."
    echo "    Что и где брать — README, раздел 3."
    echo ""
fi

echo "==> Проверяю источники и ключи"
./.venv/bin/python main.py --check-keys || true

echo ""
echo "Готово. Дальше:   ./run.sh \"Казань\""
