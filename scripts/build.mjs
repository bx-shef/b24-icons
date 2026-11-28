/**
 * Builds the bx24 Iconify collection from /icons/<set>/<name>.svg.
 *
 *   node scripts/build.mjs           build packages/icons-json and packages/icons-svg
 *   node scripts/build.mjs --check   validate sources only, write nothing
 */
import fs from 'node:fs/promises'
import { resolve } from 'node:path'
import { blankIconSet, SVG, cleanupSVG, cleanupSVGRoot, parseColors, isEmptyColor, runSVGO } from '@iconify/tools'
import { colorToString } from '@iconify/utils/lib/colors'
import {
  ROOT, ICONS_DIR, DATA_DIR, PREFIX, SETS, KEEP_COLORS_SETS, KEEP_WHITE_ICONS,
  MONO_COLORS_SET, NAME_RE, iconName, normalizeHex
} from './lib/config.mjs'

const CHECK_ONLY = process.argv.includes('--check')
const JSON_PKG = resolve(ROOT, 'packages/icons-json')
const SVG_PKG = resolve(ROOT, 'packages/icons-svg')

const errors = []
const warnings = []

/** Drops `id` attributes nothing refers to (exports from design tools are full of them). */
function dropUnusedIds(content) {
  return content.replace(/\sid="([^"]*)"/g, (match, id) => {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`#${escaped}\\b`).test(content) ? match : ''
  })
}

/**
 * Shapes without a fill inherit currentColor (as in the legacy build, which set it on <svg>),
 * unless the root says otherwise. Not applied to *specialized sets (the legacy build copied them as is).
 */
function inheritCurrentColor(content) {
  return content.replace(/<svg\b([^>]*)>/, (match, attrs) => /\sfill=/.test(attrs) ? match : `<svg${attrs} fill="currentColor">`)
}

/**
 * Для анимированных иконок, которые не идут через cleanupSVG: то же, что он запрещает и что
 * опасно при встраивании в чужую страницу (SECURITY.md).
 */
function assertSafeSvg(content) {
  const bad = [
    [/<script/i, '<script>'],
    [/\son[a-z]+\s*=/i, 'обработчик on*'],
    [/<foreignObject/i, '<foreignObject>'],
    [/(?:xlink:)?href\s*=\s*["'](?!#)/i, 'внешняя ссылка href'],
    [/url\(\s*["']?(?!#)/i, 'внешний url()'],
    [/@import/i, '@import'],
    [/javascript:/i, 'javascript:']
  ]
  for (const [re, what] of bad) if (re.test(content)) throw new Error(`animated icon contains ${what}`)
}

/** Turns inherited Bitrix24 UI colors into currentColor, keeps the rest. */
function normalizeColors(svg, set, name) {
  const keepWhite = KEEP_WHITE_ICONS.has(`${set}/${name}`)
  const literalOnly = set.includes('specialized')
  parseColors(svg, {
    callback: (_attr, colorString, color) => {
      if (!color || isEmptyColor(color)) return colorString
      // The legacy build ran svgo (named colors → hex) before converting colors,
      // except for *specialized sets, where only hex literals were converted.
      const hex = normalizeHex(literalOnly ? colorString : colorToString(color))
      if (!hex) return colorString
      if (keepWhite && hex === '#ffffff') return colorString
      return MONO_COLORS_SET.has(hex) ? 'currentColor' : colorString
    }
  })
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {
    return fallback
  }
}

async function readCatalog() {
  try {
    return JSON.parse(await fs.readFile(resolve(DATA_DIR, 'catalog.json'), 'utf8'))
  } catch {
    return { categories: {}, hidden: [] }
  }
}

async function main() {
  const iconSet = blankIconSet(PREFIX)
  const stats = {}
  const setOf = new Map()

  for (const set of SETS) {
    if (!NAME_RE.test(set)) errors.push(`bad set name: ${set}`)
    const files = (await fs.readdir(resolve(ICONS_DIR, set))).sort()
    stats[set] = 0
    for (const file of files) {
      if (!file.endsWith('.svg')) {
        errors.push(`${set}/${file}: not an svg file`)
        continue
      }
      const base = file.slice(0, -4)
      if (!NAME_RE.test(base)) {
        errors.push(`${set}/${file}: invalid name (use lowercase a-z, 0-9 and single dashes)`)
        continue
      }
      const name = iconName(set, base)
      const content = await fs.readFile(resolve(ICONS_DIR, set, file), 'utf8')
      try {
        const animated = /<animate|<set\b|@keyframes|animation/i.test(content)
        let svg
        if (animated) {
          // Анимированные иконки — как нарисованы: cleanupSVG и SVGO выкидывают transform-origin и
          // сливают группы, и вращение уезжает в угол. Безопасность — своей проверкой (assertSafeSvg).
          assertSafeSvg(content)
          svg = new SVG(content.replace(/\s+(xmlns:xlink|version)="[^"]*"/g, ''))
          // только корень: атрибуты <svg> (fill="none" и т. п.) уходят во вложенную <g>
          cleanupSVGRoot(svg)
          if (!KEEP_COLORS_SETS.has(set)) normalizeColors(svg, set, base)
        } else {
          svg = new SVG(set.includes('specialized') ? dropUnusedIds(content) : inheritCurrentColor(dropUnusedIds(content)))
          cleanupSVG(svg)
          if (!KEEP_COLORS_SETS.has(set)) normalizeColors(svg, set, base)
          runSVGO(svg)
        }
        if (iconSet.exists(name)) errors.push(`${name}: duplicate icon name`)
        iconSet.fromSVG(name, svg)
        setOf.set(name, { set, base })
        stats[set]++
      } catch (error) {
        errors.push(`${set}/${file}: ${error.message}`)
      }
    }
  }

  // Catalog: categories (themes) and hidden icons, edited with `pnpm admin`
  const catalog = await readCatalog()
  for (const [title, names] of Object.entries(catalog.categories ?? {})) {
    for (const name of names) {
      if (!iconSet.exists(name)) warnings.push(`catalog: category "${title}" references missing icon ${name}`)
      else iconSet.toggleCategory(name, title, true)
    }
  }
  for (const name of catalog.hidden ?? []) {
    const item = iconSet.entries[name]
    if (!item) warnings.push(`catalog: hidden references missing icon ${name}`)
    else item.hidden = true
  }

  for (const w of warnings) console.warn(`⚠ ${w}`)
  if (errors.length) {
    for (const e of errors) console.error(`✗ ${e}`)
    console.error(`\n${errors.length} error(s)`)
    process.exit(1)
  }

  const total = iconSet.count()
  console.log(`✓ ${total} icons in ${SETS.length} sets`)
  if (CHECK_ONLY) return

  const pkg = JSON.parse(await fs.readFile(resolve(JSON_PKG, 'package.json'), 'utf8'))
  iconSet.info = {
    name: 'Bitrix24 Icons (bx24)',
    total,
    version: pkg.version,
    author: { name: 'bx-shef', url: 'https://github.com/bx-shef/b24-icons' },
    license: { title: 'MIT', spdx: 'MIT', url: 'https://github.com/bx-shef/b24-icons/blob/main/LICENSE' },
    samples: ['outline-check-l', 'outline-search', 'solid-trashcan'].filter(n => iconSet.exists(n)),
    height: 24,
    category: 'UI 24px',
    palette: false
  }

  const icons = iconSet.export()
  const categories = {}
  for (const [title, names] of Object.entries(catalog.categories ?? {})) {
    categories[title] = names.filter(n => iconSet.exists(n)).sort()
  }
  const metadata = { categories, prefixes: Object.fromEntries(SETS.map(s => [`${s}-`, s])) }
  const names = iconSet.list(['icon'])

  // packages/icons-json
  const jsonOut = (file, data) => fs.writeFile(resolve(JSON_PKG, file), JSON.stringify(data, null, 2) + '\n')
  await jsonOut('icons.json', icons)
  await jsonOut('info.json', { prefix: PREFIX, ...iconSet.info })
  await jsonOut('metadata.json', metadata)
  const header = '// Generated by scripts/build.mjs, do not edit.\n'
  await fs.writeFile(resolve(JSON_PKG, 'index.mjs'), `${header}import icons from './icons.json' with { type: 'json' }\nimport info from './info.json' with { type: 'json' }\nimport metadata from './metadata.json' with { type: 'json' }\n\nexport { icons, info, metadata }\n`)
  await fs.writeFile(resolve(JSON_PKG, 'index.cjs'), `${header}'use strict'\n\nexports.icons = require('./icons.json')\nexports.info = require('./info.json')\nexports.metadata = require('./metadata.json')\n`)
  await fs.writeFile(resolve(JSON_PKG, 'index.d.ts'), `${header}import type { IconifyJSON, IconifyInfo, IconifyMetaData } from '@iconify/types'

/** Name inside the collection, e.g. \`outline-check-l\` */
export type Bx24IconName =
${names.map(n => `  | '${n}'`).join('\n')}

/** Name for Nuxt UI / @nuxt/icon, e.g. \`i-bx24-outline-check-l\` */
export type Bx24Icon = \`i-${PREFIX}-\${Bx24IconName}\`

export declare const icons: IconifyJSON
export declare const info: IconifyInfo
export declare const metadata: IconifyMetaData
`)

  // search index: one group per name without set and size (see packages/icons-json/search.mjs)
  const keywords = await readJson(resolve(DATA_DIR, 'keywords.json'), {})
  const legacyMap = await readJson(resolve(DATA_DIR, 'legacy-map.json'), {})
  const legacyOf = {}
  for (const [component, target] of Object.entries(legacyMap)) (legacyOf[target.split(':')[1]] ??= []).push(component)
  const hiddenSet = new Set(catalog.hidden ?? [])
  const themesOf = {}
  for (const [title, list] of Object.entries(categories)) for (const n of list) (themesOf[n] ??= []).push(title)
  const groups = new Map()
  for (const name of names) {
    if (hiddenSet.has(name)) continue
    const { set, base: fileBase } = setOf.get(name)
    const m = /^(.*)-(xs|s|m|l)$/.exec(fileBase)
    const base = m ? m[1] : fileBase
    const group = groups.get(base) ?? { base, variants: [], themes: new Set(), keywords: keywords[base] ?? [], legacy: new Set() }
    group.variants.push({ name, set, size: m ? m[2] : '' })
    for (const t of themesOf[name] ?? []) group.themes.add(t)
    for (const l of legacyOf[name] ?? []) group.legacy.add(l)
    groups.set(base, group)
  }
  for (const k of Object.keys(keywords)) if (!groups.has(k)) console.warn(`⚠ keywords: no icon group "${k}"`)
  const search = {
    prefix: PREFIX,
    version: pkg.version,
    groups: [...groups.values()]
      .map(g => ({ ...g, themes: [...g.themes].sort(), legacy: [...g.legacy].sort() }))
      .sort((a, b) => a.base.localeCompare(b.base))
  }
  await fs.writeFile(resolve(JSON_PKG, 'search.json'), JSON.stringify(search) + '\n')

  // packages/icons-svg
  const svgDir = resolve(SVG_PKG, 'svg')
  await fs.rm(svgDir, { recursive: true, force: true })
  for (const set of SETS) await fs.mkdir(resolve(svgDir, set), { recursive: true })
  for (const name of names) {
    const { set, base } = setOf.get(name)
    await fs.writeFile(resolve(svgDir, set, `${base}.svg`), iconSet.toString(name) + '\n')
  }

  // packages/icons-migrate ships the legacy name map
  await fs.copyFile(resolve(DATA_DIR, 'legacy-map.json'), resolve(ROOT, 'packages/icons-migrate/legacy-map.json'))

  console.log('✓ packages/icons-json, packages/icons-svg, packages/icons-migrate')
  console.table(stats)
}

await main()
