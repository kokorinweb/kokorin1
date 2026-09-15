# Дизайн-скиллы

Сюда вендорены два сторонних скилла. Оба стоят в проекте, а не глобально, чтобы проверка
вёрстки работала у любого, кто клонирует репозиторий, без отдельной установки.

| Папка | Источник | Лицензия |
| --- | --- | --- |
| `impeccable/` | https://github.com/pbakaus/impeccable (`plugin/skills/impeccable`) | Apache 2.0 |
| `ui-ux-pro-max/` | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (`.claude/skills/ui-ux-pro-max`) | MIT |

Обновление — перекопировать те же папки из свежего клона апстрима.

Весит это около 6 МБ. Если не нужно держать в истории — удалите папку и добавьте `.claude/`
в `.gitignore`: на работу самого сайта скиллы не влияют, они нужны только для проверки.

## Как гонять детектор

```bash
npm run build && npm run start
IMPECCABLE_BROWSER=$(which chromium) \
  .claude/skills/impeccable/scripts/impeccable detect \
  http://localhost:3000/ http://localhost:3000/menu http://localhost:3000/cart
# и отдельным прогоном мобильная ширина
IMPECCABLE_BROWSER=$(which chromium) \
  .claude/skills/impeccable/scripts/impeccable detect --viewport 390x844 http://localhost:3000/
```

Поиск по базе UX-правил:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "scroll reveal easing" --domain gsap
```
