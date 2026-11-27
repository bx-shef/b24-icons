# bx24 icons

Bitrix24 UI icons as an [Iconify](https://iconify.design) collection with the prefix **`bx24`**:
1686 icons in 15 sets, one source, works in Nuxt, Nuxt UI, Vue, React and plain HTML.

```vue
<UIcon name="i-bx24-outline-check-l" class="size-5" />
<B24Button icon="i-bx24-outline-search" />
```

Icon names are `<set>-<name>`: `outline-check-l`, `solid-trashcan`, `file-type-vue`, `common-service-telegram`…

| Package | What | For |
|---|---|---|
| [`@bxshefby/icons-json`](packages/icons-json) | Iconify JSON collection (`icons`, `info`, `metadata`, TS type of all names) | Nuxt / `@nuxt/icon`, Nuxt UI, b24-ui, `@iconify/vue`, `@iconify/react`, `iconify-icon` |
| [`@bxshefby/icons-svg`](packages/icons-svg) | optimized `.svg` files | `<img>`, design tools, anything else |
| [`@bxshefby/icons-migrate`](packages/icons-migrate) | codemod, name map, AI agent skill | moving off `@bitrix24/b24icons-vue` |

The original [`@bitrix24/b24icons-vue`](https://github.com/bitrix24/b24icons) (one Vue component per icon) keeps working as it is.
This collection is the new mechanism; see [Migration](#migration).

## Usage

### Nuxt, Nuxt UI, b24-ui (`@nuxt/icon`)

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
<UIcon name="i-bx24-outline-check-l" />      <!-- Nuxt UI -->
<Icon name="i-bx24-outline-check-l" />       <!-- @nuxt/icon -->
<UButton icon="i-bx24-outline-search" />
```

Only the icons you use end up in the client bundle (see `icon.clientBundle` in the
[Nuxt UI docs](https://ui.nuxt.com/docs/getting-started/integrations/icons/nuxt)).

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

### Plain HTML (`iconify-icon` web component)

```js
import { addCollection } from 'iconify-icon' // also registers <iconify-icon>
import { icons as bx24 } from '@bxshefby/icons-json'

addCollection(bx24)
```

```html
<iconify-icon icon="bx24:outline-check-l"></iconify-icon>
```

### SVG files

```bash
pnpm add @bxshefby/icons-svg
```

`@bxshefby/icons-svg/svg/<set>/<name>.svg`, e.g. `svg/outline/check-l.svg`.
Monochrome icons use `currentColor`: inline them to inherit the text color (in `<img>` they render black).

### TypeScript

```ts
import type { Bx24Icon, Bx24IconName } from '@bxshefby/icons-json'

const a: Bx24Icon = 'i-bx24-outline-check-l'
const b: Bx24IconName = 'outline-check-l'
```

## Migration

From `@bitrix24/b24icons-vue` components to names:

```bash
npx @bxshefby/icons-migrate src --write
```

```diff
- import CheckLIcon from '@bitrix24/b24icons-vue/outline/CheckLIcon'
- <B24Button :icon="CheckLIcon" />
+ <B24Button icon="i-bx24-outline-check-l" />
```

Hand the migration to an AI agent with the skill
[`packages/icons-migrate/skills/bx24-icons-migration/SKILL.md`](packages/icons-migrate/skills/bx24-icons-migration/SKILL.md),
for example:

> Migrate this project from `@bitrix24/b24icons-vue` to the bx24 icon collection following
> `node_modules/@bxshefby/icons-migrate/skills/bx24-icons-migration/SKILL.md`.

Names changed compared to the old file names: typos were fixed (`double-shevrons` → `double-chevrons`)
and redundant prefixes dropped (`common-service/ui-service-telegram` → `common-service-telegram`).
The full list is in [`data/renames.json`](data/renames.json), the component → name map in
[`data/legacy-map.json`](data/legacy-map.json).

## Development

```bash
pnpm install
pnpm build    # icons/ → packages/*
pnpm test
pnpm admin    # catalog editor → http://127.0.0.1:4224
```

- `icons/<set>/<name>.svg` — sources. Names: lowercase `a-z`, `0-9`, single dashes.
  Inherited Bitrix24 UI colors are turned into `currentColor` at build time (except `file-type`, which stays multicolor).
- `data/catalog.json` — themes (one icon can be in several) and hidden icons; edit it with `pnpm admin`
  and commit. Themes become Iconify categories in `metadata.json`; hidden icons stay usable but are not listed.
- `scripts/build.mjs --check` validates sources without writing anything.

## License

MIT. Icons are derived from [bitrix24/b24icons](https://github.com/bitrix24/b24icons) (MIT, © Bitrix24).
