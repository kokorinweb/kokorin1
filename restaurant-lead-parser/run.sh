#!/usr/bin/env bash
# Сбор лидов по городу.
#   ./run.sh "Казань"           — 800 заведений, стандартные фильтры
#   ./run.sh "Москва" 2000      — свой лимит
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -x .venv/bin/python ]; then
    echo "Окружение не установлено. Запусти сначала:  ./setup.sh" >&2
    exit 1
fi

CITY="${1:-}"
LIMIT="${2:-800}"
if [ -z "$CITY" ]; then
    echo "Укажи город:  ./run.sh \"Казань\"" >&2
    echo "Список городов:  ./.venv/bin/python main.py --list-cities" >&2
    exit 2
fi

SLUG=$(echo "$CITY" | tr ' ,' '__' | tr -d '"')
OUT="output/leads_${SLUG}.xlsx"

echo "==> Город: $CITY, лимит: $LIMIT"
echo "==> Результат будет в: $OUT"
echo ""

./.venv/bin/python main.py \
    --city "$CITY" \
    --limit "$LIMIT" \
    --min-confidence 85 \
    --min-lead-score 50 \
    --exclude-chains \
    --resume \
    --output "$OUT"
