import { createSearch } from '@bxshefby/icons-json/search'
import type { Bx24SearchIndex, Bx24IconGroup, Bx24SearchResult } from '@bxshefby/icons-json/search'
import type { IconifyJSON } from '@iconify/types'
import { getIconData, iconToSVG, iconToHTML, replaceIDs } from '@iconify/utils'

export const PREFIX = 'bx24'

export const SET_TITLES: Record<string, string> = {
  'outline': 'Outline',
  'solid': 'Solid',
  'main': 'Main',
  'actions': 'Actions',
  'animated': 'Animated',
  'button': 'Button',
  'button-specialized': 'Button specialized',
  'common-b24': 'Битрикс24',
  'common-service': 'Сервисы',
  'contact-center': 'Контакт-центр',
  'crm': 'CRM',
  'editor': 'Редактор',
  'file-type': 'Типы файлов',
  'social': 'Соцсети',
  'specialized': 'Иллюстрации'
}

export type CopyFormat = 'nuxt' | 'iconify' | 'b24ui' | 'vue' | 'react' | 'svg' | 'datauri'

export const COPY_FORMATS: { value: CopyFormat, label: string }[] = [
  { value: 'nuxt', label: 'i-bx24-… (Nuxt, b24-ui)' },
  { value: 'iconify', label: 'bx24:… (Iconify)' },
  { value: 'b24ui', label: '<B24Button icon>' },
  { value: 'vue', label: 'Vue (@iconify/vue)' },
  { value: 'react', label: 'React (@iconify/react)' },
  { value: 'svg', label: 'SVG' },
  { value: 'datauri', label: 'data:URI' }
]

interface CatalogState {
  ready: boolean
  error: string
  icons: IconifyJSON | null
  index: Bx24SearchIndex | null
  themes: string[]
}

const state = reactive<CatalogState>({ ready: false, error: '', icons: null, index: null, themes: [] })
let search: ReturnType<typeof createSearch> | null = null
let loading: Promise<void> | null = null
const svgCache = new Map<string, string>()

/** Collection data is fetched once in the browser (public/data, put there by scripts/site.mjs). */
export function useCatalog() {
  if (import.meta.client && !loading) {
    loading = Promise.all([
      $fetch<IconifyJSON>('/data/icons.json'),
      $fetch<Bx24SearchIndex>('/data/search.json'),
      $fetch<{ categories?: Record<string, string[]> }>('/data/metadata.json')
    ]).then(([icons, index, metadata]) => {
      state.themes = Object.keys(metadata.categories ?? {})
      state.icons = markRaw(icons)
      state.index = markRaw(index)
      search = createSearch(index)
      state.ready = true
    }).catch((e) => {
      state.error = e?.message || String(e)
    })
  }

  function find(query: string, options: { set?: string, theme?: string } = {}): Bx24SearchResult[] {
    if (!search) return []
    return search(query, { ...options, limit: 100000 }).results
  }

  /** Inline SVG for a variant; ids are made unique so gradients do not clash on the page. */
  function svg(name: string, size?: number | string): string {
    const key = `${name}@${size ?? ''}`
    const cached = svgCache.get(key)
    if (cached) return cached
    const data = state.icons && getIconData(state.icons, name)
    if (!data) return ''
    const r = iconToSVG(data, { height: size ?? 'auto' })
    const html = iconToHTML(replaceIDs(r.body, `${name}-`), { ...r.attributes, 'aria-hidden': 'true' })
    svgCache.set(key, html)
    return html
  }

  /** Standalone SVG file content (real size, currentColor stays). */
  function svgFile(name: string): string {
    const data = state.icons && getIconData(state.icons, name)
    if (!data) return ''
    // реальный размер иконки; xmlns iconToHTML добавляет сам (второй — невалидный XML)
    const r = iconToSVG(data, { height: 'auto' })
    return iconToHTML(r.body, r.attributes)
  }

  function snippet(name: string, format: CopyFormat): string {
    switch (format) {
      case 'nuxt': return `i-${PREFIX}-${name}`
      case 'iconify': return `${PREFIX}:${name}`
      case 'b24ui': return `<B24Button icon="i-${PREFIX}-${name}" />`
      case 'vue': return `<Icon icon="${PREFIX}:${name}" />`
      case 'react': return `<Icon icon="${PREFIX}:${name}" />`
      case 'svg': return svgFile(name)
      case 'datauri': return `data:image/svg+xml;utf8,${encodeURIComponent(svgFile(name))}`
    }
  }

  return { state, find, svg, svgFile, snippet }
}

/** Variant chosen inside a group: by set and size. */
export function pickVariant(group: Bx24IconGroup, set?: string, size?: string) {
  const inSet = group.variants.filter(v => v.set === (set ?? group.variants[0]!.set))
  const list = inSet.length ? inSet : group.variants
  return list.find(v => v.size === size) ?? list.find(v => v.size === 'l') ?? list[0]!
}
