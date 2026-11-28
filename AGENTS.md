# AGENTS.md

Инструкции для ИИ-агентов и людей, работающих с репозиторием.

## Что это

Иконки Bitrix24 как коллекция [Iconify](https://iconify.design) с префиксом **`bx24`**.
Один источник (`icons/`) → пакеты:

| Пакет | Что |
|---|---|
| `packages/icons-json` → `@bxshefby/icons-json` | Iconify JSON, основной пакет |
| `packages/icons-svg` → `@bxshefby/icons-svg` | оптимизированные SVG |
| `packages/icons-migrate` → `@bxshefby/icons-migrate` | codemod с `@bitrix24/b24icons-vue`, таблица имён, навык для агентов |

План и решения владельца — в issue [#2](https://github.com/bx-shef/b24-icons/issues/2) и его sub-issues.
**Решения оттуда не пересматривать без владельца.** Главные из них:

- Пакета совместимости со старым `@bitrix24/b24icons-vue` нет: старая библиотека работает как есть,
  переход — через codemod и навык.
- Префикс `bx24` (не `bx`: его занимает BoxIcons в Iconify).
- Имена иконок `<набор>-<имя>`; в Nuxt — `i-bx24-<набор>-<имя>`, в Iconify — `bx24:<набор>-<имя>`.

## Команды

```bash
pnpm install
pnpm build                          # icons/ + data/ → packages/*
pnpm test                           # тесты (нужна сборка)
node scripts/build.mjs --check      # только проверка исходников
pnpm admin                          # редактор тем, http://127.0.0.1:4224
pnpm site                           # публичный каталог в site-dist/ (после pnpm build)
```

Публичный каталог — образ `ghcr.io/bx-shef/b24-icons-site` на сервере bx-shef, как сайт
bx-shef/b24-js-sdk: `deploy/README.md`. Проверка сайта агентом с браузером — промпты в
`.github/contributing/site-check.md` (правятся в том же PR, что меняет `site/`).

Сверка цветов со старой библиотекой:
`npm pack @bitrix24/b24icons-vue`, распаковать, `node scripts/migrate/parity.mjs <package/dist>`.

## Устройство

- `icons/<набор>/<имя>.svg` — исходники. Имя: строчные `a-z`, `0-9`, одиночные дефисы.
  Список наборов и правила цвета — `scripts/lib/config.mjs`.
- `scripts/build.mjs` — сборка: удаление неиспользуемых `id`, `cleanupSVG`, перекраска цветов
  интерфейса Битрикс24 в `currentColor` (кроме `file-type`; `*specialized` — только hex-литералы, как
  в старой сборке), SVGO, экспорт.
- `data/catalog.json` — темы (`categories`) и скрытые иконки (`hidden`). Правится в `pnpm admin`.
- `data/keywords.json` — ключевые слова (ru/en) по имени группы без набора и размера (`check`, `trash-bin`).
  Правятся в `pnpm admin` (выделить одну иконку). Сборка кладёт индекс в `search.json`; поиск —
  `packages/icons-json/search.mjs`, общий для каталога и MCP `b24-ui-search-icons` в bx-shef/b24-ui.
- `site/` — публичный каталог: Nuxt на b24-ui (`@bitrix24/b24ui-nuxt`, оформление «Василёк» из документации
  b24-ui). `pnpm site` кладёт коллекцию в `site/public/data`, файлы иконок в `site/public/svg`, делает
  `nuxt generate` и собирает `site-dist/`. Поиск на странице — тот же `searchIcons()`. Страница на каждую видимую
  иконку — `/icons/<имя>` (`site/app/pages/icons/[name].vue`, данные из `site/server/api/icon` только при генерации,
  на сервере API нет); они же в `sitemap.xml`.
- `data/renames.json` — переименования при переносе; `data/legacy-map.json` — «компонент старой
  библиотеки → имя `bx24`». Сгенерирован один раз `scripts/migrate/legacy-map.mjs`.
- Сгенерированные файлы пакетов в git не хранятся (`.gitignore`).

## Переход со старой библиотеки, MCP и навыки

- Пользователю — раздел «Переход со старой библиотеки» в `README.md` (шаги, команды под тип проекта, промпт для агента).
- Агенту, который переводит чужой проект, — навык `packages/icons-migrate/skills/bx24-icons-migration/SKILL.md`
  (едет в npm-пакете `@bxshefby/icons-migrate`). Codemod — `packages/icons-migrate/bin/bx24-icons-migrate.mjs`.
- **b24-ui принимает строковые иконки в пропах только после bx-shef/b24-ui#69.** До этого codemod для проектов на b24-ui
  с `--write` не запускать: иконки в пропах пропадут. Codemod предупреждает об этом («now go to component props as strings»),
  навык велит остановиться.
- Меняешь codemod или навык — прогони их на практике, а не только тестами:
  - небольшой Vue-проект с `@bitrix24/b24icons-vue` → переход до конца по навыку, `vite build` проходит;
  - копия bx-shef/b24-js-sdk (`docs/`) → агент по навыку останавливается из-за #69; codemod без `--write` даёт отчёт без ложных `manual:`.
- MCP и чат для иконок — **только в b24-ui** (`b24-ui-search-icons`, `b24-ui-get-icon`, `docs/server/utils/bx24Icons.ts`),
  у каталога своего MCP нет. Поиск один — `packages/icons-json/search.mjs`; меняешь его выдачу — проверь и каталог, и MCP.
- Навык самой b24-ui (`skills/b24-ui-nuxt`, раздаётся на `/.well-known/skills/`) про иконки — bx-shef/b24-ui#94,
  страница про MCP в документации b24-ui — bx-shef/b24-ui#93.

## Правила

- **Имена иконок после 1.0 не меняются.** Переименование до 1.0 — только с записью в
  `data/renames.json` и обновлением `data/legacy-map.json`.
- Новая иконка: положить SVG в `icons/<набор>/`, `pnpm build && pnpm test`.
- Удалить иконку нельзя молча: в `data/legacy-map.json` на неё могут ссылаться — тест это ловит.
- Заголовок PR — conventional commits (`feat: …`, `fix(build): …`, `docs: …`), проверяется
  `pr-title.yml`; он становится squash-коммитом и строкой журнала изменений.
- Actions закрепляются по SHA с комментарием версии.
- Описание PR, issue и комментарии — по-русски. В конце комментария агента — подпись
  `_Generated by Claude Code_`.
- Агент сам заводит issue и PR и мержит squash-ом, когда CI зелёный (разрешение владельца), и
  отмечает выполненное в плане #2.
