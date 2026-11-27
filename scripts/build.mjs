/**
 * Builds the bx24 Iconify collection from /icons/<set>/<name>.svg.
 *
 *   node scripts/build.mjs           build packages/icons-json and packages/icons-svg
 *   node scripts/build.mjs --check   validate sources only, write nothing
 */
import fs from 'node:fs/promises'
import { resolve } from 'node:path'
import { blankIconSet, SVG, cleanupSVG, parseColors, isEmptyColor, runSVGO } from '@iconify/tools'
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
        const svg = new SVG(set.includes('specialized') ? dropUnusedIds(content) : inheritCurrentColor(dropUnusedIds(content)))
        cleanupSVG(svg)
        if (!KEEP_COLORS_SETS.has(set)) normalizeColors(svg, set, base)
        const animated = /<animate|<set\b|@keyframes|animation/i.test(content)
        runSVGO(svg, { animated, keepShapes: animated })
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

  // packages/icons-svg
  const svgDir = resolve(SVG_PKG, 'svg')
  await fs.rm(svgDir, { recursive: true, force: true })
  for (const set of SETS) await fs.mkdir(resolve(svgDir, set), { recursive: true })
  for (const name of names) {
    const { set, base } = setOf.get(name)
    await fs.writeFile(resolve(svgDir, set, `${base}.svg`), iconSet.toString(name) + '\n')
  }

  console.log('✓ packages/icons-json, packages/icons-svg')
  console.table(stats)
}

await main()
