<script setup lang="ts">
import type { Bx24SearchResult } from '@bxshefby/icons-json/search'
import Search2Icon from '@bitrix24/b24icons-vue/main/Search2Icon'
import { refDebounced, useIntersectionObserver } from '@vueuse/core'

const router = useRouter()
const toast = useToast()
const { state, find, svg, snippet } = useCatalog()

// ---- state in the URL: ?q=&set=&theme=&icon= ----
const query = ref('')
const set = ref('')
const theme = ref('')
const openName = ref('')

// The page is prerendered without a query string, and hydration resets the address to "/".
// An inline script in nuxt.config.ts keeps the original query in window.__bx24Search.
onMounted(() => {
  const p = new URLSearchParams((window as { __bx24Search?: string }).__bx24Search ?? window.location.search)
  query.value = p.get('q') ?? ''
  set.value = p.get('set') ?? ''
  theme.value = p.get('theme') ?? ''
  openName.value = p.get('icon') ?? ''
})

watch([query, set, theme, openName], () => {
  const q: Record<string, string> = {}
  if (query.value) q.q = query.value
  if (set.value) q.set = set.value
  if (theme.value) q.theme = theme.value
  if (openName.value) q.icon = openName.value
  router.replace({ query: q })
})

// ---- copy format and preview size: per-viewer, kept in localStorage ----
const format = ref<CopyFormat>('nuxt')
const iconSize = ref(32)
onMounted(() => {
  try {
    const f = localStorage.getItem('bx24:format') as CopyFormat | null
    if (f && COPY_FORMATS.some(x => x.value === f)) format.value = f
    const s = Number(localStorage.getItem('bx24:size'))
    if (s >= 16 && s <= 64) iconSize.value = s
  } catch {}
})
watch(format, v => { try { localStorage.setItem('bx24:format', v) } catch {} })
watch(iconSize, v => { try { localStorage.setItem('bx24:size', String(v)) } catch {} })

// ---- search ----
const debounced = refDebounced(query, 120)
const results = computed<Bx24SearchResult[]>(() => state.ready
  ? find(debounced.value, { set: set.value || undefined, theme: theme.value || undefined })
  : [])

const STEP = 240
const limit = ref(STEP)
watch(results, () => { limit.value = STEP })
const shown = computed(() => results.value.slice(0, limit.value))
const sentinel = ref<HTMLElement | null>(null)
useIntersectionObserver(sentinel, ([entry]) => {
  if (entry?.isIntersecting && limit.value < results.value.length) limit.value += STEP
}, { rootMargin: '600px' })

// ---- filters ----
const setItems = computed(() => {
  const counts: Record<string, number> = {}
  for (const g of state.index?.groups ?? []) for (const s of new Set(g.variants.map(v => v.set))) counts[s] = (counts[s] ?? 0) + 1
  return [{ label: 'Все наборы', value: ALL }, ...Object.keys(SET_TITLES).filter(s => counts[s]).map(s => ({ label: `${SET_TITLES[s]} · ${counts[s]}`, value: s }))]
})
// themes in the order the owner set in the catalog editor (metadata.json), with group counts
const themeItems = computed(() => {
  const counts: Record<string, number> = {}
  for (const g of state.index?.groups ?? []) {
    if (set.value && !g.variants.some(v => v.set === set.value)) continue
    for (const t of g.themes) counts[t] = (counts[t] ?? 0) + 1
  }
  return state.themes.filter(t => counts[t]).map(t => ({ title: t, count: counts[t]! }))
})
const total = computed(() => state.index?.groups.length ?? 0)
const iconCount = computed(() => state.index?.groups.reduce((n, g) => n + g.variants.length, 0) ?? 0)

// Reka Select does not allow an empty value: "all" stands for "no filter"
const ALL = 'all'
const setModel = computed({ get: () => set.value || ALL, set: v => { set.value = v === ALL ? '' : v } })
const themeModel = computed({ get: () => theme.value || ALL, set: v => { theme.value = v === ALL ? '' : v } })

function resetFilters() {
  query.value = ''
  set.value = ''
  theme.value = ''
}

function setOf(name: string, group: Bx24SearchResult) {
  return group.variants.find(v => v.name === name)?.set ?? ''
}

function variantsLabel(n: number) {
  const m10 = n % 10, m100 = n % 100
  const word = m10 === 1 && m100 !== 11 ? 'вариант' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'варианта' : 'вариантов'
  return `${n} ${word}`
}

// ---- actions ----
function nameFor(group: Bx24SearchResult) {
  return set.value ? (group.variants.find(v => v.set === set.value && (v.size === 'l' || v.size === ''))?.name ?? group.name) : group.name
}

async function copy(name: string, fmt: CopyFormat = format.value) {
  const text = snippet(name, fmt)
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: 'Скопировано', description: fmt === 'svg' || fmt === 'datauri' ? `${name} · ${fmt.toUpperCase()}` : text, duration: 1800 })
  } catch {
    toast.add({ title: 'Не удалось скопировать', color: 'air-primary-alert', duration: 2500 })
  }
}

const openGroup = computed(() => openName.value
  ? state.index?.groups.find(g => g.variants.some(v => v.name === openName.value)) ?? null
  : null)

function open(name: string) {
  openName.value = name
}

// ---- keyboard: / focuses search, arrows move between cards, Enter copies, I opens details ----
const searchInput = useTemplateRef<{ inputRef: HTMLInputElement }>('searchInput')
defineShortcuts({
  '/': () => searchInput.value?.inputRef?.focus()
})

function focusFirstCard() {
  document.querySelector<HTMLElement>('[data-card]')?.focus()
}

function onGridKey(e: KeyboardEvent) {
  const el = e.target as HTMLElement
  const card = el.closest<HTMLElement>('[data-card]')
  if (!card) return
  const cards = [...(card.parentElement?.querySelectorAll<HTMLElement>('[data-card]') ?? [])]
  const i = cards.indexOf(card)
  const columns = cards.findIndex(c => c.offsetTop !== cards[0]!.offsetTop)
  const perRow = columns > 0 ? columns : cards.length
  const move: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: perRow, ArrowUp: -perRow }
  if (e.key in move) {
    e.preventDefault()
    cards[Math.min(cards.length - 1, Math.max(0, i + move[e.key]!))]?.focus()
  } else if (e.key === 'i' || e.key === 'ш') {
    e.preventDefault()
    open(card.dataset.name!)
  }
}
</script>

<template>
  <div>
    <B24Container class="pt-10 pb-6">
      <div class="flex flex-col lg:flex-row gap-8 lg:items-start justify-between">
        <div class="max-w-xl lg:pt-6">
          <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1b1a22] dark:text-white">
            Иконки <span class="vsk-gradient-text">Битрикс24</span>
          </h1>
          <p class="mt-3 text-(--tai-text-2)">
            {{ iconCount || '…' }} иконок коллекции Iconify <code class="font-mono">bx24</code> для Nuxt, b24-ui, Vue, React и SVG.
            Размеры и стили одной иконки собраны в одну карточку — всего {{ total || '…' }} карточек.
            Клик по иконке копирует её имя; ищите по-русски, по-английски и по старому имени компонента.
          </p>
        </div>
        <InstallTabs />
      </div>
    </B24Container>

    <div class="sticky top-(--b24ui-header-height) z-10 backdrop-blur-md bg-white/70 dark:bg-(--ui-color-copilot-bg-content-3)/50 border-y border-black/10 dark:border-white/10">
      <B24Container class="py-3 flex flex-wrap gap-2 items-center">
        <B24Input
          ref="searchInput"
          v-model="query"
          :icon="Search2Icon"
          placeholder="Поиск: корзина, arrow, CheckLIcon…"
          class="w-full sm:w-80"
          aria-label="Поиск иконок"
          autofocus
          @keydown.down.prevent="focusFirstCard"
        >
          <template #trailing>
            <B24Kbd value="/" class="hidden sm:inline-flex" />
          </template>
        </B24Input>
        <B24Select v-model="setModel" :items="setItems" class="w-full sm:w-52" aria-label="Набор" />
        <B24Select
          v-model="format"
          :items="COPY_FORMATS"
          class="w-full sm:w-60"
          aria-label="Что копировать по клику"
        />
        <label class="flex items-center gap-2 text-sm text-(--tai-text-2)">
          Размер
          <input v-model.number="iconSize" type="range" min="16" max="64" step="4" class="w-24 accent-(--tai-accent)">
        </label>
      </B24Container>
    </div>

    <B24Container class="py-6 grid lg:grid-cols-[220px_1fr] gap-6">
      <nav aria-label="Темы" class="hidden lg:block">
        <div class="sticky top-[calc(var(--b24ui-header-height)+76px)] max-h-[calc(100vh-var(--b24ui-header-height)-96px)] overflow-y-auto pe-2 space-y-0.5">
          <button
            type="button"
            class="w-full flex justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-start transition-colors"
            :class="!theme ? 'bg-black/10 dark:bg-white/15 text-[#1b1a22] dark:text-white' : 'text-(--tai-text-2) hover:bg-black/5 dark:hover:bg-white/10'"
            @click="theme = ''"
          >
            <span>Все темы</span><span class="opacity-60">{{ total }}</span>
          </button>
          <button
            v-for="t in themeItems"
            :key="t.title"
            type="button"
            class="w-full flex justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-start transition-colors"
            :class="theme === t.title ? 'bg-black/10 dark:bg-white/15 text-[#1b1a22] dark:text-white' : 'text-(--tai-text-2) hover:bg-black/5 dark:hover:bg-white/10'"
            @click="theme = t.title"
          >
            <span>{{ t.title }}</span><span class="opacity-60">{{ t.count }}</span>
          </button>
        </div>
      </nav>

      <section aria-live="polite" class="min-w-0">
        <div class="lg:hidden mb-3">
          <B24Select
            v-model="themeModel"
            :items="[{ label: 'Все темы', value: ALL }, ...themeItems.map(t => ({ label: `${t.title} · ${t.count}`, value: t.title }))]"
            class="w-full"
            aria-label="Тема"
          />
        </div>

        <p class="text-sm text-(--tai-text-2) mb-3">
          <template v-if="state.error">Не удалось загрузить коллекцию: {{ state.error }}</template>
          <template v-else-if="!state.ready">Загрузка коллекции…</template>
          <template v-else>
            {{ results.length }} из {{ total }} карточек
            <button v-if="query || set || theme" type="button" class="ms-2 vsk-link text-[#1b1a22] dark:text-white" @click="resetFilters">
              сбросить фильтры
            </button>
          </template>
        </p>

        <div
          v-if="state.ready && results.length"
          class="grid gap-2"
          :style="{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(104, iconSize * 2.4)}px, 1fr))` }"
          @keydown="onGridKey"
        >
          <div
            v-for="group in shown"
            :key="group.base"
            data-card
            :data-name="nameFor(group)"
            tabindex="0"
            role="button"
            :aria-label="`${nameFor(group)}: копировать`"
            class="group relative flex flex-col items-center gap-2 rounded-lg border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 hover:border-(--tai-accent) focus-visible:outline-2 px-2 pt-4 pb-2 cursor-pointer text-[#1b1a22] dark:text-white transition-colors"
            @click="copy(nameFor(group))"
            @keydown.enter.prevent="copy(nameFor(group))"
          >
            <span
              class="flex items-center justify-center"
              :style="{ width: `${iconSize}px`, height: `${iconSize}px` }"
              v-html="svg(nameFor(group), iconSize)"
            />
            <span class="text-xs text-(--tai-text-2) text-center break-all leading-tight">{{ group.base }}</span>
            <span class="text-[10px] text-(--tai-text-2) opacity-70 text-center">
              {{ SET_TITLES[setOf(nameFor(group), group)] ?? '' }}<template v-if="group.variants.length > 1"> · {{ variantsLabel(group.variants.length) }}</template>
            </span>
            <button
              type="button"
              class="absolute top-0.5 end-0.5 size-8 sm:size-6 rounded-md text-sm sm:text-xs text-(--tai-text-2) hover:text-[#1b1a22] dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/15 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus-visible:opacity-100"
              :aria-label="`Подробнее: ${group.base}`"
              title="Подробнее (I)"
              @click.stop="open(nameFor(group))"
            >
              ⓘ
            </button>
          </div>
        </div>
        <B24Empty
          v-else-if="state.ready"
          title="Ничего не нашлось"
          description="Попробуйте другое слово: по-русски, по-английски или старое имя компонента. Или сбросьте фильтры."
          :actions="[{ label: 'Сбросить фильтры', onClick: resetFilters }]"
        />
        <div ref="sentinel" class="h-1" />
      </section>
    </B24Container>

    <IconDetails
      :group="openGroup"
      :name="openName"
      @update:name="openName = $event"
      @close="openName = ''"
      @copy="copy"
    />
  </div>
</template>
