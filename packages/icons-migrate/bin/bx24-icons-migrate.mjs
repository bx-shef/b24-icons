#!/usr/bin/env node
/**
 * Codemod: @bitrix24/b24icons-vue components → bx24 icon names (strings).
 *
 *   npx @bxshefby/icons-migrate [paths...] [--write] [--component B24Icon] [--prefix i-bx24-] [--name-prop name]
 *   npx @bxshefby/icons-migrate lookup outline/CheckLIcon
 *
 * Without --write it only reports what it would change (dry run).
 *
 * Rewrites, in .vue/.ts/.tsx/.js/.jsx/.md files:
 *   import CheckLIcon from '@bitrix24/b24icons-vue/outline/CheckLIcon'   → (removed)
 *   :icon="CheckLIcon"          → icon="i-bx24-outline-check-l"   (any prop bound to the component)
 *   <CheckLIcon class="size-5" /> → <B24Icon name="i-bx24-outline-check-l" class="size-5" />
 *   icon: CheckLIcon            → icon: 'i-bx24-outline-check-l'   (any other reference in code)
 * Everything it cannot rewrite safely is reported as "manual" for a human or an AI agent.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const MAP = JSON.parse(fs.readFileSync(path.join(here, '../legacy-map.json'), 'utf8'))

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(name)
  if (i === -1) return fallback
  const value = args[i + 1]
  args.splice(i, 2)
  return value
}
const WRITE = args.includes('--write')
const COMPONENT = flag('--component', 'B24Icon')
const PREFIX = flag('--prefix', 'i-bx24-')
const NAME_PROP = flag('--name-prop', 'name')
const paths = args.filter(a => !a.startsWith('--'))

const toName = target => PREFIX + target.split(':')[1]

if (paths[0] === 'lookup') {
  for (const key of paths.slice(1)) {
    const clean = key.replace(/^@bitrix24\/b24icons-vue\//, '').replace(/\.(js|mjs)$/, '')
    const target = MAP[clean]
    console.log(target ? `${clean} → ${toName(target)}` : `${clean} → (not found)`)
  }
  process.exit(0)
}

const EXT = new Set(['.vue', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.md', '.mdc'])
const SKIP_DIRS = new Set(['node_modules', '.git', '.nuxt', '.output', 'dist', '.data', 'coverage'])

function* walk(p) {
  const stat = fs.statSync(p)
  if (stat.isFile()) {
    if (EXT.has(path.extname(p))) yield p
    return
  }
  for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue
    yield * walk(path.join(p, entry.name))
  }
}

const IMPORT_RE = /^[ \t]*import\s+(\w+)\s+from\s+['"]@bitrix24\/b24icons-vue\/([\w-]+)\/(\w+)(?:\.m?js)?['"];?[ \t]*\r?\n?/gm
const NAMED_IMPORT_RE = /import\s*\{[^}]*\}\s*from\s*['"]@bitrix24\/b24icons-vue[^'"]*['"]/g

function migrate(source) {
  const manual = []
  const found = new Map() // local identifier → icon name
  let out = source.replace(IMPORT_RE, (match, local, set, component) => {
    const target = MAP[`${set}/${component}`]
    if (!target) {
      manual.push(`unknown icon ${set}/${component} (kept import)`)
      return match
    }
    found.set(local, toName(target))
    return ''
  })
  for (const m of source.matchAll(NAMED_IMPORT_RE)) manual.push(`named import, rewrite by hand: ${m[0]}`)
  if (!found.size) return { out: source, manual, count: 0 }

  let count = 0
  for (const [local, name] of found) {
    const id = local.replace(/\$/g, '\\$')
    // :icon="X" / v-bind:trailing-icon="X" → icon="name"
    out = out.replace(new RegExp(`(?:v-bind)?:([\\w-]+)="\\s*${id}\\s*"`, 'g'), (_, prop) => {
      count++
      return `${prop}="${name}"`
    })
    // <X ... /> or <X ...></X> → <B24Icon name="..." ... />
    out = out.replace(new RegExp(`<${id}(?=[\\s/>])`, 'g'), () => {
      count++
      return `<${COMPONENT} ${NAME_PROP}="${name}"`
    })
    out = out.replace(new RegExp(`</${id}>`, 'g'), `</${COMPONENT}>`)
    // remaining references in code: icon: X, [X, ...], () => X ...
    out = out.replace(new RegExp(`(?<![\\w$./-])${id}(?![\\w$-])`, 'g'), (match, offset, whole) => {
      const prev = whole[offset - 1]
      const next = whole[offset + match.length]
      // a literal string 'X' / "X" (e.g. a static attribute) is not a reference
      if (prev && prev === next && `'"\``.includes(prev)) return match
      count++
      return `'${name}'`
    })
    if (new RegExp(`(?<![\\w$])${id}(?![\\w$])`).test(out)) manual.push(`${local} is still referenced, check by hand`)
    if (/h\(\s*'i-bx24-/.test(out)) manual.push(`h('<icon name>') found: render functions need h(${COMPONENT}, { name }) instead`)
  }
  if (out.includes(`<${COMPONENT} `) && !new RegExp(`\\b${COMPONENT}\\b`).test(source)) {
    manual.push(`uses <${COMPONENT}>: make sure it is registered (auto-import in Nuxt / b24ui plugin in Vue)`)
  }
  return { out, manual, count }
}

let files = 0
let changes = 0
const report = []
for (const root of paths.length ? paths : ['.']) {
  for (const file of walk(root)) {
    const source = fs.readFileSync(file, 'utf8')
    if (!source.includes('@bitrix24/b24icons-vue')) continue
    const { out, manual, count } = migrate(source)
    if (out !== source) {
      files++
      changes += count
      if (WRITE) fs.writeFileSync(file, out)
    }
    report.push({ file, count, manual })
  }
}

for (const { file, count, manual } of report) {
  console.log(`${count ? '✓' : '·'} ${file}${count ? ` (${count})` : ''}`)
  for (const m of manual) console.log(`    manual: ${m}`)
}
console.log(`\n${WRITE ? 'Changed' : 'Would change'} ${files} file(s), ${changes} replacement(s).${WRITE ? '' : ' Run with --write to apply.'}`)
const manualCount = report.reduce((n, r) => n + r.manual.length, 0)
if (manualCount) console.log(`${manualCount} item(s) need manual review (lines starting with "manual:").`)
