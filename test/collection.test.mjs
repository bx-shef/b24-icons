import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { validateIconSet, getIconData, quicklyValidateIconSet } from '@iconify/utils'
import { NAME_RE, SETS, PREFIX } from '../scripts/lib/config.mjs'

const read = file => JSON.parse(fs.readFileSync(new URL(file, import.meta.url), 'utf8'))
const icons = read('../packages/icons-json/icons.json')
const metadata = read('../packages/icons-json/metadata.json')
const legacy = read('../data/legacy-map.json')

test('collection is a valid Iconify JSON with the bx24 prefix', () => {
  assert.equal(icons.prefix, PREFIX)
  assert.ok(quicklyValidateIconSet(icons))
  validateIconSet(icons)
})

test('every icon name is "<set>-<name>" with a valid name', () => {
  for (const name of Object.keys(icons.icons)) {
    assert.match(name, NAME_RE, name)
    assert.ok(SETS.some(set => name.startsWith(`${set}-`)), `${name}: unknown set`)
  }
})

test('monochrome icons do not keep inherited UI colors', () => {
  for (const [name, icon] of Object.entries(icons.icons)) {
    if (name.startsWith('file-type-') || name.includes('specialized-')) continue
    assert.doesNotMatch(icon.body, /#(333|333333|525c69|535c69)\b/i, name)
  }
})

test('every legacy component maps to an existing icon', () => {
  for (const [legacyName, target] of Object.entries(legacy)) {
    const [prefix, name] = target.split(':')
    assert.equal(prefix, PREFIX)
    assert.ok(getIconData(icons, name), `${legacyName} → ${target}`)
  }
})

test('catalog categories reference existing icons', () => {
  for (const [title, names] of Object.entries(metadata.categories ?? {})) {
    for (const name of names) assert.ok(icons.icons[name], `${title}: ${name}`)
  }
})
