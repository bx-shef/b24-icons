---
name: bx24-icons-migration
description: Migrate a project from @bitrix24/b24icons-vue icon components to bx24 icon names (Iconify strings such as i-bx24-outline-check-l). Use when a repository imports from '@bitrix24/b24icons-vue', when asked to switch icons to bx24 / Iconify / @nuxt/icon, or to replace icon components with string names.
---

# Migrating to bx24 icons

The old library ships one Vue component per icon:

```ts
import CheckLIcon from '@bitrix24/b24icons-vue/outline/CheckLIcon'
```
```vue
<B24Button :icon="CheckLIcon" />
<CheckLIcon class="size-5" />
```

The new collection `bx24` is an Iconify set. Icons are **strings**, named `<set>-<name>`:

| Where | Form |
|---|---|
| Nuxt, Nuxt UI, b24-ui (string `icon` props, `<B24Icon name>` / `<UIcon name>`) | `i-bx24-outline-check-l` |
| `@iconify/vue`, `@iconify/react`, `<iconify-icon>` | `bx24:outline-check-l` |

Find icon names in the catalog https://b24-icons.bx-shef.by or with the b24-ui MCP tool `b24-ui-search-icons` (https://b24-ui.bx-shef.by/mcp/).

The old package keeps working; migrate only when the project wants the new mechanism.
Old and new can live side by side during the migration.

## 1. Find out the setup

1. Search for `@bitrix24/b24icons-vue` (and `@bitrix24/b24icons-nuxt`) in the code and `package.json`.
2. Decide the target:
   - **b24-ui (`@bitrix24/b24ui-nuxt` or the bx-shef fork) with string icon support** → component `B24Icon`, prefix `i-bx24-`. Check that the installed b24-ui version accepts strings in `icon` props; if it does not, stop and tell the user to upgrade it first.
   - **Nuxt UI** → component `UIcon`, prefix `i-bx24-`.
   - **Nuxt without a UI library** → `@nuxt/icon`, component `Icon`, prefix `i-bx24-`.
   - **Plain Vue** → `@iconify/vue`: `--component Icon --prefix bx24: --name-prop icon`.
   - **React** → `@iconify/react`; the codemod does not handle JSX components, use the name map (step 3) and rewrite by hand.

## 2. Install and register the collection

```bash
pnpm add @bxshefby/icons-json
```

Nuxt (`@nuxt/icon`, also used by Nuxt UI and b24-ui):
```ts
// nuxt.config.ts
import { icons as bx24 } from '@bxshefby/icons-json'

export default defineNuxtConfig({
  icon: {
    customCollections: [bx24]
  }
})
```
(b24-ui may already register it; then skip this step.)

Plain Vue / React / web component, once at startup:
```ts
import { addCollection } from '@iconify/vue' // or '@iconify/react', 'iconify-icon'
import { icons as bx24 } from '@bxshefby/icons-json'
addCollection(bx24)
```

## 3. Run the codemod (dry run first)

```bash
npx @bxshefby/icons-migrate src app components pages docs            # report only
npx @bxshefby/icons-migrate src app components pages docs --write    # apply
```
Options: `--component B24Icon|UIcon|Icon` (default `B24Icon`), `--prefix i-bx24-|bx24:` (default `i-bx24-`), `--name-prop name|icon` (default `name`).
Look up one icon: `npx @bxshefby/icons-migrate lookup outline/CheckLIcon`.
The full map is `@bxshefby/icons-migrate/legacy-map.json` (`"outline/CheckLIcon": "bx24:outline-check-l"`).

What it rewrites:
- removes `import X from '@bitrix24/b24icons-vue/<set>/<Component>'`;
- `:icon="X"`, `:trailing-icon="X"` (any bound prop) → `icon="i-bx24-…"`;
- `<X class="…" />` → `<B24Icon name="i-bx24-…" class="…" />`;
- any other reference (`icon: X`, `cond ? X : Y`, arrays, returns) → `'i-bx24-…'`.

## 4. Review what the codemod reports as `manual:`

- **`X is still referenced`** — usually a comment or JSDoc (`@defaultValue \`outline/CheckLIcon\``): update the text to the new name. If it is code, replace it with the string.
- **`uses <B24Icon>`** — make sure the icon component is available: auto-imported in Nuxt; in plain Vue register the UI library plugin or import the component.
- **render functions** — `h(X)` became `h('i-bx24-…')`, which is wrong: write `h(B24Icon, { name: 'i-bx24-…' })`.
- **types** — props typed as `IconComponent` / `Component` that now receive strings: widen to `string | IconComponent` (or just `string`).
- **named imports** from `@bitrix24/b24icons-vue` — rewrite by hand with the map.
- **dynamic names** built at runtime (`` `i-bx24-${x}` ``) are not bundled by `@nuxt/icon` scanning: list them in `icon.clientBundle.icons` or keep the server bundle.

## 5. Finish

1. Remove `@bitrix24/b24icons-vue` / `@bitrix24/b24icons-nuxt` from `package.json` only when nothing imports them anymore.
2. Run the project's typecheck, lint and tests; open a page with icons and check that they render (missing icons render as an empty box and log a warning in dev).
3. In the summary, list the files changed and every `manual:` item and how it was resolved.

Do not rename icons yourself: if an icon is missing from the map, report it instead of guessing.
