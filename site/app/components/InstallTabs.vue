<script setup lang="ts">
const items = [
  {
    label: 'Nuxt / b24-ui',
    slot: 'nuxt' as const,
    code: `// nuxt.config.ts
import { icons as bx24 } from '@bxshefby/icons-json'

export default defineNuxtConfig({
  icon: { customCollections: [bx24] }
})

// <B24Button icon="i-bx24-outline-check-l" />`
  },
  {
    label: 'Vue',
    slot: 'vue' as const,
    code: `import { Icon, addCollection } from '@iconify/vue'
import { icons as bx24 } from '@bxshefby/icons-json'

addCollection(bx24)
// <Icon icon="bx24:outline-check-l" />`
  },
  {
    label: 'React',
    slot: 'react' as const,
    code: `import { Icon, addCollection } from '@iconify/react'
import { icons as bx24 } from '@bxshefby/icons-json'

addCollection(bx24)
// <Icon icon="bx24:outline-check-l" />`
  },
  {
    label: 'HTML',
    slot: 'html' as const,
    code: `import { addCollection } from 'iconify-icon'
import { icons as bx24 } from '@bxshefby/icons-json'

addCollection(bx24)
// <iconify-icon icon="bx24:outline-check-l"></iconify-icon>`
  }
]
</script>

<template>
  <div class="w-full max-w-2xl">
    <code class="block text-sm mb-3 px-3 py-2 rounded-md bg-[#1b1a22] text-white/90 font-mono">pnpm add @bxshefby/icons-json</code>
    <B24Tabs :items="items" size="sm" :b24ui="{ content: 'pt-2' }">
      <template v-for="item in items" #[item.slot] :key="item.slot">
        <pre class="text-xs leading-relaxed overflow-x-auto px-3 py-2 rounded-md bg-[#1b1a22] text-white/90"><code>{{ item.code }}</code></pre>
      </template>
    </B24Tabs>
  </div>
</template>
