<script setup lang="ts">
import type { Bx24IconGroup } from '@bxshefby/icons-json/search'

const props = defineProps<{ group: Bx24IconGroup | null, name: string }>()
const emit = defineEmits<{ 'update:name': [string], 'close': [], 'copy': [string, CopyFormat] }>()
const { svg, svgFile, snippet } = useCatalog()

const open = computed({
  get: () => !!props.group,
  set: (v) => { if (!v) emit('close') }
})

const variant = computed(() => props.group?.variants.find(v => v.name === props.name) ?? props.group?.variants[0])
const sets = computed(() => [...new Set(props.group?.variants.map(v => v.set) ?? [])])
const sizes = computed(() => props.group?.variants.filter(v => v.set === variant.value?.set).map(v => v.size).filter(Boolean) ?? [])

function selectSet(set: string) {
  if (!props.group) return
  emit('update:name', pickVariant(props.group, set, variant.value?.size).name)
}
function selectSize(size: string) {
  if (!props.group || !variant.value) return
  emit('update:name', pickVariant(props.group, variant.value.set, size).name)
}

const bg = ref<'dark' | 'light' | 'checker'>('dark')
const color = ref('')
const previewSize = ref(96)

const rows = computed(() => props.name
  ? COPY_FORMATS.filter(f => f.value !== 'datauri').map(f => ({ ...f, text: snippet(props.name, f.value) }))
  : [])

const downloadHref = computed(() => props.name ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgFile(props.name) + '\n')}` : '')
</script>

<template>
  <B24Slideover
    v-model:open="open"
    :title="name"
    :description="group ? `${group.variants.length > 1 ? 'Варианты: ' + group.variants.length + ' · ' : ''}${group.themes.join(', ') || 'без темы'}` : ''"
    :b24ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <div v-if="group && variant" class="space-y-5">
        <div
          class="rounded-xl flex items-center justify-center h-48"
          :class="`bx-bg-${bg}`"
          :style="color ? { color } : {}"
        >
          <span :style="{ width: `${previewSize}px`, height: `${previewSize}px` }" v-html="svg(name, previewSize)" />
        </div>

        <div class="flex flex-wrap gap-3 items-center text-sm">
          <B24FieldGroup size="xs">
            <B24Button label="Тёмный" :color="bg === 'dark' ? 'air-primary' : 'air-tertiary'" @click="bg = 'dark'" />
            <B24Button label="Светлый" :color="bg === 'light' ? 'air-primary' : 'air-tertiary'" @click="bg = 'light'" />
            <B24Button label="Шахматка" :color="bg === 'checker' ? 'air-primary' : 'air-tertiary'" @click="bg = 'checker'" />
          </B24FieldGroup>
          <label class="flex items-center gap-2">
            Цвет
            <input v-model="color" type="color" class="size-7 rounded cursor-pointer bg-transparent" aria-label="Цвет иконки">
          </label>
          <label class="flex items-center gap-2">
            Размер
            <input v-model.number="previewSize" type="range" min="16" max="160" step="8" class="w-28">
          </label>
        </div>

        <div v-if="sets.length > 1" class="space-y-1.5">
          <p class="text-xs uppercase tracking-wide opacity-70">Стиль</p>
          <div class="flex flex-wrap gap-1.5">
            <B24Button
              v-for="s in sets"
              :key="s"
              size="xs"
              :label="SET_TITLES[s] ?? s"
              :color="s === variant.set ? 'air-primary' : 'air-tertiary'"
              @click="selectSet(s)"
            />
          </div>
        </div>
        <div v-if="sizes.length > 1" class="space-y-1.5">
          <p class="text-xs uppercase tracking-wide opacity-70">Размер</p>
          <div class="flex flex-wrap gap-1.5">
            <B24Button
              v-for="s in sizes"
              :key="s"
              size="xs"
              :label="s.toUpperCase()"
              :color="s === variant.size ? 'air-primary' : 'air-tertiary'"
              @click="selectSize(s)"
            />
          </div>
        </div>

        <div class="space-y-2">
          <div v-for="row in rows" :key="row.value" class="space-y-1">
            <p class="text-xs opacity-70">{{ row.label }}</p>
            <div class="flex flex-col sm:flex-row gap-2 min-w-0">
              <code class="flex-1 min-w-0 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-md bg-black/5 dark:bg-white/10 px-3 py-2 text-xs font-mono">{{ row.text }}</code>
              <B24Button size="sm" color="air-secondary-accent" label="Копировать" @click="emit('copy', name, row.value)" />
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <B24Button :to="downloadHref" :download="`${name}.svg`" color="air-secondary" label="Скачать SVG" />
          <B24Button :to="`/icons/${name}`" color="air-tertiary" label="Страница иконки" />
          <B24Button color="air-tertiary" label="data:URI" @click="emit('copy', name, 'datauri')" />
        </div>

        <div v-if="group.legacy.length" class="text-sm space-y-1">
          <p class="text-xs uppercase tracking-wide opacity-70">Было в @bitrix24/b24icons-vue</p>
          <p class="font-mono text-xs break-all">{{ group.legacy.join(', ') }}</p>
        </div>
        <div v-if="group.keywords.length" class="space-y-1.5">
          <p class="text-xs uppercase tracking-wide opacity-70">Ключевые слова</p>
          <div class="flex flex-wrap gap-1">
            <B24Badge v-for="k in group.keywords" :key="k" :label="k" color="air-secondary" size="sm" />
          </div>
        </div>
      </div>
    </template>
  </B24Slideover>
</template>
