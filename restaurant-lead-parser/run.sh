#!/usr/bin/env bash
# Сбор лидов по городу.
#   ./run.sh                          — диалог: спросит город и нишу
#   ./run.sh "Казань"                 — общепит, 800 компаний
#   ./run.sh "Казань" "барбершопы"    — своя ниша
#   ./run.sh "Москва" "кофейни" 2000  — своя ниша и лимит
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -x .venv/bin/python ]; then
    echo "Окружение не установлено. Запусти сначала:  ./setup.sh" >&2
    exit 1
fi

CITY="${1:-}"
NICHE="${2:-}"
LIMIT="${3:-800}"

# без аргументов — диалоговый режим
if [ -z "$CITY" ]; then
    exec ./.venv/bin/python main.py --interactive
fi

SLUG=$(echo "${CITY}_${NICHE:-obshepit}" | tr ' ,' '__' | tr -d '"')
OUT="output/leads_${SLUG}.xlsx"

echo "==> Город: $CITY"
echo "==> Ниша:  ${NICHE:-весь общепит}"
echo "==> Лимит: $LIMIT"
echo "==> Результат: $OUT"
echo ""

./.venv/bin/python main.py \
    --city "$CITY" \
    --niche "$NICHE" \
    --limit "$LIMIT" \
    --min-confidence 85 \
    --min-lead-score 50 \
    --exclude-chains \
    --resume \
    --output "$OUT"
