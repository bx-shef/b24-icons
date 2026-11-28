# Иконки bx24

Иконки Битрикс24 как коллекция [Iconify](https://iconify.design) с префиксом **`bx24`**: 1686 иконок в 15 наборах.
Один источник для Nuxt, Nuxt UI, b24-ui, Vue, React и обычного HTML.

```vue
<Icon name="i-bx24-outline-check-l" />     <!-- Nuxt, @nuxt/icon -->
<UIcon name="i-bx24-outline-check-l" />    <!-- Nuxt UI -->
```

Имя иконки — `<набор>-<имя>`: `outline-check-l`, `solid-trashcan`, `file-type-vue`, `common-service-telegram`.
В Nuxt к нему добавляется `i-bx24-`, в Iconify — `bx24:`.

**Найти иконку:** каталог https://b24-icons.bx-shef.by — поиск по-русски, по-английски и по старому имени
компонента (`CheckLIcon`), темы, копирование имени в один клик.

## Ресурсы

| | |
|---|---|
| Каталог иконок | https://b24-icons.bx-shef.by |
| Bitrix24 UI — Vue-компоненты для приложений; MCP-сервер с поиском иконок | https://b24-ui.bx-shef.by |
| Bitrix24 JS SDK | https://b24-js-sdk.bx-shef.by |
| npm | [`@bxshefby/icons-json`](https://www.npmjs.com/package/@bxshefby/icons-json) · [`@bxshefby/icons-svg`](https://www.npmjs.com/package/@bxshefby/icons-svg) · [`@bxshefby/icons-migrate`](https://www.npmjs.com/package/@bxshefby/icons-migrate) |
| План и решения | [issue #2](https://github.com/bx-shef/b24-icons/issues/2) |

## Как устроено

```text
icons/<набор>/<имя>.svg ─┐
data/catalog.json ───────┤  pnpm build   ┌─ @bxshefby/icons-json ── Nuxt / @nuxt/icon, Nuxt UI, b24-ui,
data/keywords.json ──────┼──────────────►│    (коллекция, поиск)     @iconify/vue, @iconify/react, HTML
data/legacy-map.json ────┘               ├─ @bxshefby/icons-svg  ── файлы .svg
                                         └─ @bxshefby/icons-migrate ── переход со старой библиотеки
                                                    │
        npm ◄── release-please + публикация из CI ──┘
         │
         ├──► каталог  b24-icons.bx-shef.by  (site/, тот же поиск, образ ghcr → сервер bx-shef)
         ├──► b24-ui   b24-ui.bx-shef.by     (MCP: b24-ui-search-icons, b24-ui-get-icon)
         └──► b24-js-sdk                     (документация на иконках bx24)
```

| Пакет | Что внутри | Кому |
|---|---|---|
| [`@bxshefby/icons-json`](packages/icons-json) | коллекция Iconify (`icons`, `info`, `metadata`), поиск (`search`), TS-тип всех имён | всем, основной пакет |
| [`@bxshefby/icons-svg`](packages/icons-svg) | оптимизированные `.svg` | `<img>`, дизайн-инструменты |
| [`@bxshefby/icons-migrate`](packages/icons-migrate) | codemod, таблица «старое имя → новое», навык для ИИ-агентов | переход с `@bitrix24/b24icons-vue` |

Где что в репозитории:

| Путь | Что |
|---|---|
| `icons/` | исходные SVG |
| `data/catalog.json`, `data/keywords.json` | темы, скрытые иконки, ключевые слова поиска — правятся в `pnpm admin` |
| `data/renames.json`, `data/legacy-map.json` | переименования при переносе и таблица старых имён |
| `scripts/build.mjs` | сборка пакетов |
| `packages/` | npm-пакеты |
| `site/` | каталог (Nuxt на b24-ui) |
| `admin/` | локальный редактор тем и ключевых слов |
| `deploy/` | образ и установка каталога на сервер |
| `AGENTS.md` | правила для людей и ИИ-агентов |
| `RELEASING.md` | выпуск в npm |

Старая библиотека [`@bitrix24/b24icons-vue`](https://github.com/bitrix24/b24icons) (компонент на каждую иконку)
продолжает работать как есть. `bx24` — новый механизм; переход — ниже.

## Подключение

### Nuxt, Nuxt UI (`@nuxt/icon`)

```bash
pnpm add @bxshefby/icons-json
```

```ts
// nuxt.config.ts
import { icons as bx24 } from '@bxshefby/icons-json'

export default defineNuxtConfig({
  icon: {
    customCollections: [bx24]
  }
})
```

```vue
<Icon name="i-bx24-outline-check-l" />       <!-- @nuxt/icon -->
<UIcon name="i-bx24-outline-check-l" />      <!-- Nuxt UI -->
<UButton icon="i-bx24-outline-search" />
```

В клиентский бандл попадают только используемые иконки (см. `icon.clientBundle` в
[документации Nuxt UI](https://ui.nuxt.com/docs/getting-started/integrations/icons/nuxt)).

### b24-ui

Строковые иконки в пропах (`<B24Button icon="i-bx24-…">`) появятся с [bx-shef/b24-ui#69](https://github.com/bx-shef/b24-ui/issues/69).
До этого в пропы `icon` компонентов b24-ui передаётся компонент, а отдельные иконки рисуются через `@nuxt/icon`, как выше.

### Vue (`@iconify/vue`)

```ts
import { addCollection } from '@iconify/vue'
import { icons as bx24 } from '@bxshefby/icons-json'

addCollection(bx24)
```

```vue
<Icon icon="bx24:outline-check-l" />
```

### React (`@iconify/react`)

```tsx
import { Icon, addCollection } from '@iconify/react'
import { icons as bx24 } from '@bxshefby/icons-json'

addCollection(bx24)

export const Ok = () => <Icon icon="bx24:outline-check-l" />
```

### Обычный HTML (`iconify-icon`)

```js
import { addCollection } from 'iconify-icon' // заодно регистрирует <iconify-icon>
import { icons as bx24 } from '@bxshefby/icons-json'

addCollection(bx24)
```

```html
<iconify-icon icon="bx24:outline-check-l"></iconify-icon>
```

### Файлы SVG

```bash
pnpm add @bxshefby/icons-svg
```

`@bxshefby/icons-svg/svg/<набор>/<имя>.svg`, например `svg/outline/check-l.svg`.
Одноцветные иконки рисуются `currentColor`: вставленные в HTML, они берут цвет текста (в `<img>` — чёрные).

### TypeScript

```ts
import type { Bx24Icon, Bx24IconName } from '@bxshefby/icons-json'

const a: Bx24Icon = 'i-bx24-outline-check-l'
const b: Bx24IconName = 'outline-check-l'
```

## Поиск, MCP и ИИ-агенты

Поиск один на всех: каталог, MCP-сервер b24-ui и ваш код используют `createSearch()` из
`@bxshefby/icons-json/search`. Он понимает русские и английские слова, темы и старые имена компонентов.

```ts
import index from '@bxshefby/icons-json/search.json' with { type: 'json' }
import { createSearch } from '@bxshefby/icons-json/search'

const search = createSearch(index)
search('галочка', { limit: 5 }).results.map(r => r.name) // ['outline-check-l', …]
```

Результат — группы: одно имя без набора и размера (`check`) и все его варианты
(`outline-check-l`, `outline-check-m`, `solid-check`…).

**MCP и чат для работы с иконками даёт сайт b24-ui**, своего MCP у каталога нет:

```bash
claude mcp add --transport http b24-ui https://b24-ui.bx-shef.by/mcp/
```

| Инструмент | Что делает |
|---|---|
| `b24-ui-search-icons` | поиск: `query` (по-русски, по-английски, `CheckLIcon`), `limit`, `set`, `theme`; возвращает имена `i-bx24-…`, картинку из каталога, варианты, темы, старое имя |
| `b24-ui-get-icon` | одна иконка: SVG, варианты, примеры для @nuxt/icon, Vue, React, b24-ui |

Инструменты работают с той версией `@bxshefby/icons-json`, что стоит в b24-ui (сейчас `^0.1`).
Подробная страница про MCP в документации b24-ui — [bx-shef/b24-ui#93](https://github.com/bx-shef/b24-ui/issues/93).

## Переход со старой библиотеки

Было — компонент на иконку, стало — строка:

```diff
- import CheckLIcon from '@bitrix24/b24icons-vue/outline/CheckLIcon'
- <CheckLIcon class="size-5" />
+ <Icon name="i-bx24-outline-check-l" class="size-5" />
```

Найти новое имя одной иконки:

```bash
npx @bxshefby/icons-migrate lookup outline/CheckLIcon
# outline/CheckLIcon → i-bx24-outline-check-l
```

### Шаги

1. **Подключите коллекцию** — раздел «Подключение» выше.
2. **Посмотрите, что изменится** (файлы не трогаются):
   ```bash
   npx @bxshefby/icons-migrate src
   ```
   Codemod покажет файлы, число замен, места для ручной проверки (`manual:`) и сколько иконок уйдёт в пропы компонентов.
3. **Выберите вид замены под проект:**

   | Проект | Команда |
   |---|---|
   | Nuxt + `@nuxt/icon` | `npx @bxshefby/icons-migrate src --component Icon --write` |
   | Nuxt UI | `npx @bxshefby/icons-migrate src --component UIcon --write` |
   | Vue + `@iconify/vue` | `npx @bxshefby/icons-migrate src --component Icon --prefix bx24: --name-prop icon --write` |
   | b24-ui | `npx @bxshefby/icons-migrate src --write` (тег `B24Icon`) — **только с версией b24-ui, где принят [#69](https://github.com/bx-shef/b24-ui/issues/69)** |

   Если codemod пишет «N icon(s) now go to component props as strings», значит иконки передаются в пропы
   (`icon: X`, `:icon="X"`). В b24-ui без #69 такие иконки пропадут — ждите #69. В Nuxt UI строки работают уже сейчас.
4. **Разберите строки `manual:`** — codemod сам называет каждое место:
   `h(X)` в render-функциях → `h(Icon, { … })`; `<component :is>` с иконками-строками → `<Icon :icon>`;
   старые имена в комментариях; закомментированные импорты; пути `@bitrix24/b24icons-vue` в конфиге (`optimizeDeps`).
   Что делать с каждым — таблица в навыке (шаг 4). В обычном Vue в файлы с `<Icon>` добавьте `import { Icon } from '@iconify/vue'`.
5. **Проверьте** typecheck, тесты и страницы с иконками; удалите `@bitrix24/b24icons-vue` из `package.json`,
   когда его больше никто не импортирует.

Проверено на практике:
- небольшой Vue-проект (`@iconify/vue`): агент по навыку перевёл его до конца, `vite build` проходит;
- документация bx-shef/b24-js-sdk (b24-ui): 15 файлов, 72 замены, 49 иконок уходят в пропы компонентов b24-ui —
  агент по навыку остановился до `--write`, перевод ждёт #69.

### Через ИИ-агента

Навык с подробными шагами лежит в пакете: `node_modules/@bxshefby/icons-migrate/skills/bx24-icons-migration/SKILL.md`
([исходник](packages/icons-migrate/skills/bx24-icons-migration/SKILL.md)). Промпт для агента:

```text
Переведи этот проект с @bitrix24/b24icons-vue на иконки bx24.
Сначала выполни `npm i -D @bxshefby/icons-migrate`, затем действуй по
node_modules/@bxshefby/icons-migrate/skills/bx24-icons-migration/SKILL.md.
Перед --write покажи вывод codemod без --write и выбранный вариант (--component/--prefix).
В конце перечисли изменённые файлы и все пункты manual: с тем, как они решены.
```

### Что изменилось в именах

По сравнению со старыми файлами исправлены опечатки (`double-shevrons` → `double-chevrons`)
и убраны лишние приставки (`common-service/ui-service-telegram` → `common-service-telegram`).
Полный список — [`data/renames.json`](data/renames.json), таблица «компонент → имя» —
[`data/legacy-map.json`](data/legacy-map.json).

## Разработка

```bash
pnpm install
pnpm build    # icons/ → packages/*
pnpm test
pnpm admin    # редактор тем и ключевых слов → http://127.0.0.1:4224
pnpm site     # каталог → site-dist/ (образ ghcr.io/bx-shef/b24-icons-site, см. deploy/README.md)
```

- Имена файлов в `icons/` — строчные `a-z`, `0-9`, одиночные дефисы. Цвета интерфейса Битрикс24 при сборке
  становятся `currentColor` (кроме `file-type` — они цветные).
- Темы, скрытые иконки и ключевые слова правятся в `pnpm admin`, затем коммит. Скрытые иконки работают, но не видны в каталоге.
- `node scripts/build.mjs --check` — только проверка исходников.
- Правила для людей и агентов — [`AGENTS.md`](AGENTS.md), выпуск — [`RELEASING.md`](RELEASING.md).

## Лицензия

[MIT](LICENSE) © 2024 Bitrix24, © 2026 ООО «БэИксШефБай». Иконки основаны на [bitrix24/b24icons](https://github.com/bitrix24/b24icons) (MIT).
