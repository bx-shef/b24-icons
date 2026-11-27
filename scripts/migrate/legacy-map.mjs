/**
 * One-off: builds data/legacy-map.json — `@bitrix24/b24icons-vue/<set>/<Component>` → `bx24:<set>-<name>`.
 *
 * Usage: node scripts/migrate/legacy-map.mjs <path-to-original-b24icons-src-icons> <renames.json> <old-dist-dir>
 *  - original src/icons dir (file names before renaming)
 *  - renames.json: { renames: [{ set, from, to }], drops: [{ set, from, to }] }
 *  - old dist dir of @bitrix24/b24icons-vue (to verify that every published component is mapped)
 */
import fs from 'node:fs/promises'
import { resolve } from 'node:path'
import camelcase from 'camelcase'
import { DATA_DIR, PREFIX, SETS, iconName } from '../lib/config.mjs'

const [srcDir, renamesFile, distDir] = process.argv.slice(2)

/** Port of prepareIconName() from bitrix24/b24icons scripts/build.js */
function legacyComponentName(type, fileName) {
  let name = camelcase(
    fileName.replace(/\.svg$/, '')
      .replaceAll(' ', '')
      .replaceAll('(', '').replaceAll(')', '')
      .replaceAll('[', '').replaceAll(']', '')
      .replaceAll('{', '').replaceAll('}', ''),
    { pascalCase: true }
  )
  name = name
    .replace('Ui', '')
    .replace('White', '').replace('Black', '')
    .replace('Light', '').replace('Dark', '')
  if (type === 'common-service') {
    name = name.replace('Service', '')
  }
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}Icon`
}

const renames = JSON.parse(await fs.readFile(renamesFile, 'utf8'))
const renameOf = new Map()
for (const r of [...renames.renames, ...(renames.drops ?? [])]) {
  renameOf.set(`${r.set}/${r.from}`, r.to)
}

const map = {}
const problems = []
for (const set of SETS) {
  const files = (await fs.readdir(resolve(srcDir, set))).filter(f => f.endsWith('.svg')).sort()
  const published = new Set(
    (await fs.readdir(resolve(distDir, set, 'esm')).catch(() => []))
      .filter(f => f.endsWith('Icon.js'))
      .map(f => f.replace(/\.js$/, ''))
  )
  for (const file of files) {
    const base = file.replace(/\.svg$/, '')
    const component = legacyComponentName(set, file)
    const name = renameOf.get(`${set}/${base}`) ?? base
    const key = `${set}/${component}`
    if (map[key] && map[key] !== `${PREFIX}:${iconName(set, name)}`) {
      // legacy build had a name collision: the later file overwrote the earlier one
      problems.push(`collision ${key}: ${map[key]} vs ${iconName(set, name)}`)
    }
    map[key] = `${PREFIX}:${iconName(set, name)}`
    published.delete(component)
  }
  for (const c of published) problems.push(`published but not mapped: ${set}/${c}`)
}

await fs.mkdir(DATA_DIR, { recursive: true })
await fs.writeFile(resolve(DATA_DIR, 'legacy-map.json'), JSON.stringify(map, null, 2) + '\n')
console.log(`legacy-map.json: ${Object.keys(map).length} entries`)
for (const p of problems) console.warn(`! ${p}`)
