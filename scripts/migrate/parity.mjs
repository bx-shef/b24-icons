/**
 * Compares the built collection with the published @bitrix24/b24icons-vue package:
 * same viewBox and same set of colors for every icon from data/legacy-map.json.
 *
 * Usage: node scripts/migrate/parity.mjs <old-dist-dir>
 *   (old dist: `npm pack @bitrix24/b24icons-vue` → package/dist)
 */
import fs from 'node:fs/promises'
import { resolve } from 'node:path'
import { getIconData } from '@iconify/utils'
import { DATA_DIR, ROOT, normalizeHex } from '../lib/config.mjs'

const distDir = process.argv[2]
const map = JSON.parse(await fs.readFile(resolve(DATA_DIR, 'legacy-map.json'), 'utf8'))
const icons = JSON.parse(await fs.readFile(resolve(ROOT, 'packages/icons-json/icons.json'), 'utf8'))

function colors(text) {
  const out = new Set()
  for (const m of text.matchAll(/(?:fill|stroke|stop-color|color)["']?\s*[:=]\s*["']?\s*(#[0-9a-fA-F]{3,6}\b|currentColor|white|black)/g)) {
    const v = m[1]
    out.add(v === 'currentColor' ? v : v === 'white' ? '#ffffff' : v === 'black' ? '#000000' : normalizeHex(v))
  }
  return [...out].sort().join(' ')
}

let ok = 0
const diffs = []
for (const [legacy, target] of Object.entries(map)) {
  const [set, component] = legacy.split('/')
  const js = await fs.readFile(resolve(distDir, set, 'esm', `${component}.js`), 'utf8').catch(() => null)
  if (!js) continue // overwritten by a name collision in the legacy build
  const icon = getIconData(icons, target.split(':')[1])
  if (!icon) {
    diffs.push(`${legacy}: ${target} missing`)
    continue
  }
  const vb = /viewBox:\s*"([^"]+)"/.exec(js)?.[1]
  const ourVb = `${icon.left ?? 0} ${icon.top ?? 0} ${icon.width} ${icon.height}`
  const a = colors(js)
  const b = colors(icon.body)
  const problems = []
  if (vb && vb.split(/\s+/).map(Number).join(' ') !== ourVb.split(' ').map(Number).join(' ')) problems.push(`viewBox ${vb} → ${ourVb}`)
  if (a !== b) problems.push(`colors [${a}] → [${b}]`)
  if (problems.length) diffs.push(`${legacy} (${target}): ${problems.join('; ')}`)
  else ok++
}

console.log(`✓ ${ok} identical, ${diffs.length} different`)
for (const d of diffs) console.log(`  ${d}`)
