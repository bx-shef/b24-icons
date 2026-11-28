<script setup lang="ts">
// Страница одной иконки: ссылка, которой можно поделиться, и страница для поисковиков (bx-shef/b24-icons#20).
const route = useRoute()
const config = useRuntimeConfig()
const toast = useToast()
const name = String(route.params.name)

const { data, error } = await useFetch(`/api/icon/${name}`)
if (error.value || !data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Иконка не найдена', fatal: true })
}
const icon = data.value

const rows = computed(() => [
  { label: 'Nuxt, Nuxt UI, @nuxt/icon', text: `i-bx24-${name}` },
  { label: 'Iconify (Vue, React, iconify-icon)', text: `bx24:${name}` },
  { label: 'b24-ui (строковые иконки — с bx-shef/b24-ui#69)', text: `<B24Button icon="i-bx24-${name}" />` },
  { label: 'Vue (@iconify/vue)', text: `<Icon icon="bx24:${name}" />` },
  { label: 'React (@iconify/react)', text: `<Icon icon="bx24:${name}" />` },
  { label: 'SVG', text: icon.svg }
])

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: 'Скопировано', duration: 1500 })
  } catch {
    toast.add({ title: 'Не удалось скопировать', color: 'air-primary-alert' })
  }
}

const bg = ref<'dark' | 'light' | 'checker'>('light')
const download = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(icon.svg + '\n')}`
const words = icon.group?.keywords.slice(0, 8).join(', ')

useSeoMeta({
  title: `${name} — иконка bx24 для Битрикс24`,
  description: `Иконка ${name} коллекции bx24${words ? `: ${words}` : ''}. Имя для Nuxt и b24-ui — i-bx24-${name}, SVG, примеры для Vue и React.`,
  ogTitle: `${name} — иконка bx24`,
  ogDescription: `Иконка ${name} коллекции bx24 для Nuxt, b24-ui, Vue, React и SVG.`,
  ogUrl: config.public.siteUrl ? `${config.public.siteUrl}/icons/${name}` : undefined
})
useHead({
  link: config.public.siteUrl ? [{ rel: 'canonical', href: `${config.public.siteUrl}/icons/${name}` }] : []
})
</script>

<template>
  <B24Container class="py-8 max-w-4xl">
    <nav class="text-sm text-(--tai-text-2) mb-4 flex flex-wrap gap-1">
      <NuxtLink to="/" class="vsk-link">Каталог</NuxtLink>
      <template v-if="icon.group?.themes[0]">
        <span>/</span>
        <a class="vsk-link" :href="`/?theme=${encodeURIComponent(icon.group.themes[0])}`">{{ icon.group.themes[0] }}</a>
      </template>
    </nav>

    <h1 class="text-2xl sm:text-3xl font-semibold text-[#1b1a22] dark:text-white break-all">{{ name }}</h1>
    <p class="mt-1 text-(--tai-text-2)">
      {{ icon.width }}×{{ icon.height }}<template v-if="icon.group?.themes.length"> · {{ icon.group.themes.join(', ') }}</template>
    </p>

    <div class="mt-6 grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-6">
      <div>
        <div class="rounded-xl flex items-center justify-center h-64" :class="`bx-bg-${bg}`">
          <span class="size-32 [&>svg]:size-full" v-html="icon.svg" />
        </div>
        <B24FieldGroup size="xs" class="mt-3">
          <B24Button label="Светлый" :color="bg === 'light' ? 'air-primary' : 'air-tertiary'" @click="bg = 'light'" />
          <B24Button label="Тёмный" :color="bg === 'dark' ? 'air-primary' : 'air-tertiary'" @click="bg = 'dark'" />
          <B24Button label="Шахматка" :color="bg === 'checker' ? 'air-primary' : 'air-tertiary'" @click="bg = 'checker'" />
        </B24FieldGroup>
        <div class="mt-4 flex flex-wrap gap-2">
          <B24Button :to="download" :download="`${name}.svg`" color="air-secondary" label="Скачать SVG" />
          <B24Button :to="`/?icon=${name}`" color="air-tertiary" label="Открыть в каталоге" />
        </div>

        <div v-if="icon.group && icon.group.variants.length > 1" class="mt-6">
          <h2 class="text-sm uppercase tracking-wide opacity-70 mb-2">Варианты</h2>
          <div class="flex flex-wrap gap-1.5">
            <NuxtLink
              v-for="v in icon.group.variants"
              :key="v.name"
              :to="`/icons/${v.name}`"
              class="rounded-md border px-2 py-1 text-xs"
              :class="v.name === name ? 'border-(--tai-accent) bg-black/5 dark:bg-white/10' : 'border-black/10 dark:border-white/15 hover:border-(--tai-accent)'"
              :aria-current="v.name === name ? 'page' : undefined"
            >{{ v.set }}{{ v.size ? ' · ' + v.size.toUpperCase() : '' }}</NuxtLink>
          </div>
        </div>
      </div>

      <div class="space-y-3 min-w-0">
        <div v-for="row in rows" :key="row.label" class="space-y-1 min-w-0">
          <p class="text-xs text-(--tai-text-2)">{{ row.label }}</p>
          <div class="flex flex-col sm:flex-row gap-2 min-w-0">
            <code class="flex-1 min-w-0 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-md bg-black/5 dark:bg-white/10 px-3 py-2 text-xs font-mono">{{ row.text }}</code>
            <B24Button size="sm" color="air-secondary-accent" label="Копировать" @click="copy(row.text)" />
          </div>
        </div>

        <div v-if="icon.group?.legacy.length" class="pt-2">
          <h2 class="text-sm uppercase tracking-wide opacity-70 mb-1">Было в @bitrix24/b24icons-vue</h2>
          <p class="font-mono text-xs break-all">{{ icon.group.legacy.join(', ') }}</p>
        </div>
        <div v-if="icon.group?.keywords.length">
          <h2 class="text-sm uppercase tracking-wide opacity-70 mb-1">Ключевые слова</h2>
          <div class="flex flex-wrap gap-1">
            <span v-for="k in icon.group.keywords" :key="k" class="rounded-full bg-black/5 dark:bg-white/10 px-2 py-0.5 text-xs">{{ k }}</span>
          </div>
        </div>
      </div>
    </div>
  </B24Container>
</template>
