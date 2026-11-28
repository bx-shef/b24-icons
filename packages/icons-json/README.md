# @bxshefby/icons-json

Bitrix24 UI icons as an [Iconify](https://iconify.design) JSON collection, prefix **`bx24`**.
Names are `<set>-<name>`: `outline-check-l`, `solid-trashcan`, `file-type-vue`…

```ts
// nuxt.config.ts — Nuxt, Nuxt UI, b24-ui (@nuxt/icon)
import { icons as bx24 } from '@bxshefby/icons-json'
export default defineNuxtConfig({ icon: { customCollections: [bx24] } })
```
```vue
<UIcon name="i-bx24-outline-check-l" />
```

```ts
// Vue / React / web component
import { addCollection } from '@iconify/vue' // '@iconify/react', 'iconify-icon'
import { icons as bx24 } from '@bxshefby/icons-json'
addCollection(bx24)
// <Icon icon="bx24:outline-check-l" />
```

Exports: `icons` (IconifyJSON), `info`, `metadata` (themes as categories), types `Bx24Icon` /
`Bx24IconName`; raw files `@bxshefby/icons-json/icons.json`, `info.json`, `metadata.json`.

Catalog: https://b24-icons.bx-shef.by · Docs: https://github.com/bx-shef/b24-icons
