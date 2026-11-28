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

Do this **before** the codemod dry run. Package manager: use whatever the project uses (`pnpm add` / `npm i` / `yarn add`).

1. Search for `@bitrix24/b24icons-vue` (and `@bitrix24/b24icons-nuxt`) in the code and `package.json`.
2. Decide the target:
   - **b24-ui (`@bitrix24/b24ui-nuxt` / `@bxshefby/b24ui-nuxt`)** → component `B24Icon`, prefix `i-bx24-`. String icons in b24-ui props work only in versions that include bx-shef/b24-ui#69. Without it b24-ui silently drops string icons (`isUnsafeIcon` rejects every string). Check the version the project actually uses:
     - with dependencies installed: `ls node_modules/@*/b24ui-nuxt/dist/runtime/components/Icon.vue` — the file must exist;
     - without them: take the pinned version from the lockfile and check the published package, e.g. `npm pack @bxshefby/b24ui-nuxt@<version>` in a temp dir, then look for `dist/runtime/components/Icon.vue`.

     No `Icon.vue` (no `B24Icon`) → **stop** before `--write` and tell the user to upgrade b24-ui to a release that includes bx-shef/b24-ui#69. You may still show them the dry run.
   - **Nuxt UI** → component `UIcon`, prefix `i-bx24-`.
   - **Nuxt without a UI library** → `@nuxt/icon` (`pnpm add -D @nuxt/icon`, add `'@nuxt/icon'` to `modules`), component `Icon`, prefix `i-bx24-`.
   - **Plain Vue** → `@iconify/vue` (install it if missing): `--component Icon --prefix bx24: --name-prop icon`. Every file that uses `<Icon>` needs `import { Icon } from '@iconify/vue'`.
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

Plain Vue / React / web component, once at startup — in the app entry (`src/main.ts` / `main.js`):
```ts
import { addCollection } from '@iconify/vue' // or '@iconify/react', 'iconify-icon'
import { icons as bx24 } from '@bxshefby/icons-json'
addCollection(bx24)
```
This puts the whole collection (~1.3 MB, ~0.5 MB gzip) into the bundle. To ship only the icons you use, register a subset:
`import { getIcons } from '@iconify/utils'` → `addCollection(getIcons(bx24, ['outline-check-l', …]))`.

## 3. Run the codemod (dry run first)

```bash
npx @bxshefby/icons-migrate src            # report only
npx @bxshefby/icons-migrate src --write    # apply
```
Pass the folders that hold the code: `src`, or `app components pages` in Nuxt, or `docs` for a docs site inside a monorepo. Missing folders are skipped.
In the output `✓ file (N)` means N replacements in that file, `· file` means the file mentions the old package but has nothing to rewrite automatically (see its `manual:` lines).
Options: `--component B24Icon|UIcon|Icon` (default `B24Icon`), `--prefix i-bx24-|bx24:` (default `i-bx24-`), `--name-prop name|icon` (default `name`).

Read the dry-run summary before `--write`:
- `manual:` lines — places to fix by hand (step 4);
- `N icon(s) now go to component props as strings` — icons passed to props (`:icon="X"`, `icon: X`). Fine for Nuxt UI and `@nuxt/icon`; for b24-ui only with bx-shef/b24-ui#69 (step 1).
Look up one icon: `npx @bxshefby/icons-migrate lookup outline/CheckLIcon`.
The full map is `@bxshefby/icons-migrate/legacy-map.json` (`"outline/CheckLIcon": "bx24:outline-check-l"`).

What it rewrites:
- removes `import X from '@bitrix24/b24icons-vue/<set>/<Component>'`;
- `:icon="X"`, `:trailing-icon="X"` (any bound prop) → `icon="i-bx24-…"`;
- `<X class="…" />` → `<B24Icon name="i-bx24-…" class="…" />`;
- any other reference (`icon: X`, `cond ? X : Y`, arrays, returns) → `'i-bx24-…'`.

## 4. Review what the codemod reports as `manual:`

Each `manual:` line is one thing to fix by hand. `<Icon>` / `name` below stand for your target (`B24Icon`/`name`, `UIcon`/`name`, `Icon`/`icon`).

| `manual:` says | What to do |
|---|---|
| `uses <Icon>: make sure it is available` | Nuxt: nothing (auto-import). Plain Vue: `import { Icon } from '@iconify/vue'` in that file. |
| `h(X, …) in a render function` | Replace `h(X, props)` with `h(Icon, { icon: 'bx24:…', ...props })` (or `name:` for Nuxt components) and import `Icon`. The codemod already put the string there; it does not render on its own. |
| `<component :is="…"> may now get icon strings` | Icons in data (`{ icon: X }`) became strings; `<component :is="'bx24:…'">` renders nothing. Use `<Icon :icon="item.icon" />` (or `:name`). |
| `X is mentioned in a comment` | Update the comment text to the new name, or delete the comment. |
| `X is still referenced` | Code still uses the component name (JSDoc, a type, a dynamic lookup): replace it with the string by hand. |
| `N commented-out import(s)` | Delete them. |
| `N string mention(s) … (e.g. optimizeDeps.include in nuxt.config)` | Remove those paths once nothing imports the old package. |
| `named import, rewrite by hand` | Rewrite with the map (`lookup`). |

Also check:
- **types** — props typed as `IconComponent` / `Component` that now receive strings: widen to `string | IconComponent` (or just `string`);
- **dynamic names** built at runtime (`` `i-bx24-${x}` ``) are not bundled by `@nuxt/icon` scanning: list them in `icon.clientBundle.icons`.

## 5. Finish

1. Remove `@bitrix24/b24icons-vue` / `@bitrix24/b24icons-nuxt` once nothing imports them: `pnpm remove @bitrix24/b24icons-vue` (or `npm rm …`).
2. Run the project's build, typecheck, lint and tests; open a page with icons and check that they render (a missing icon is an empty box and a warning in dev).
3. In the summary, list the files changed and every `manual:` item and how it was resolved.

Do not rename icons yourself: if an icon is missing from the map, report it instead of guessing.
