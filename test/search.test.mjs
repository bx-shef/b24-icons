import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createSearch, tokenize } from '@bxshefby/icons-json/search'

const index = JSON.parse(fs.readFileSync(new URL('../packages/icons-json/search.json', import.meta.url), 'utf8'))
const icons = JSON.parse(fs.readFileSync(new URL('../packages/icons-json/icons.json', import.meta.url), 'utf8'))
const search = createSearch(index)
const first = (q, o) => search(q, o).results[0]?.name

test('index groups sizes and sets under one name', () => {
  const check = index.groups.find(g => g.base === 'check')
  assert.ok(check)
  assert.deepEqual(check.variants.filter(v => v.set === 'outline').map(v => v.size).sort(), ['l', 'm', 's', 'xs'])
  for (const g of index.groups) for (const v of g.variants) assert.ok(icons.icons[v.name], v.name)
})

test('every visible icon is in exactly one group', () => {
  const seen = new Set()
  for (const g of index.groups) for (const v of g.variants) {
    assert.ok(!seen.has(v.name), v.name)
    seen.add(v.name)
  }
  const hidden = Object.entries(icons.icons).filter(([, i]) => i.hidden).length
  assert.equal(seen.size, Object.keys(icons.icons).length - hidden)
})

test('finds by name, Nuxt name, Iconify name and old component name', () => {
  assert.equal(first('check'), 'outline-check-l')
  assert.equal(first('i-bx24-outline-check-l'), 'outline-check-l')
  assert.equal(first('bx24:outline-check-l'), 'outline-check-l')
  assert.equal(first('CheckLIcon'), 'outline-check-l')
  assert.equal(first('@bitrix24/b24icons-vue/outline/CheckLIcon'), 'outline-check-l')
})

test('all query words must match; filters narrow the result', () => {
  const r = search('arrow down')
  assert.ok(r.results.every(g => /arrow/.test(g.base + g.keywords.join(' ')) || g.themes.length))
  assert.equal(search('zzzz-nothing').total, 0)
  assert.ok(search('', { set: 'solid' }).results.every(g => g.variants.some(v => v.set === 'solid')))
  const theme = index.groups.find(g => g.themes.length)?.themes[0]
  assert.ok(search('', { theme, limit: 999 }).results.every(g => g.themes.includes(theme)))
  assert.equal(search('', { limit: 5 }).results.length, 5)
})

test('preferred variant follows the requested set', () => {
  assert.equal(first('check', { set: 'outline' }), 'outline-check-l')
  const solidOnly = search('', { set: 'solid', limit: 1 }).results[0]
  assert.ok(solidOnly.name.startsWith('solid-'))
})

test('tokenize splits camelCase, separators and normalizes ё', () => {
  assert.deepEqual(tokenize('CheckLIcon'), ['check', 'l', 'icon'])
  assert.deepEqual(tokenize('outline/arrow-down_l'), ['outline', 'arrow', 'down', 'l'])
  assert.deepEqual(tokenize('Ёлка'), ['елка'])
})
