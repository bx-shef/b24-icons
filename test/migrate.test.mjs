import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const BIN = new URL('../packages/icons-migrate/bin/bx24-icons-migrate.mjs', import.meta.url).pathname

const SOURCE = `<script setup lang="ts">
import CheckLIcon from '@bitrix24/b24icons-vue/outline/CheckLIcon'
import GitHubIcon from '@bitrix24/b24icons-vue/social/GitHubIcon'
const items = [{ label: 'a', icon: CheckLIcon }]
const label = 'CheckLIcon'
</script>
<template>
  <B24Button :icon="copied ? CheckLIcon : GitHubIcon" />
  <B24Button :trailing-icon="GitHubIcon" />
  <CheckLIcon class="size-5" />
</template>
`

function run(args) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bx24-migrate-'))
  const file = path.join(dir, 'a.vue')
  fs.writeFileSync(file, SOURCE)
  const out = execFileSync(process.execPath, [BIN, dir, '--write', ...args], { encoding: 'utf8' })
  return { code: fs.readFileSync(file, 'utf8'), out }
}

test('codemod rewrites imports, props, tags and references (b24-ui defaults)', () => {
  const { code } = run([])
  assert.doesNotMatch(code, /@bitrix24\/b24icons-vue/)
  assert.match(code, /icon: 'i-bx24-outline-check-l'/)
  assert.match(code, /:icon="copied \? 'i-bx24-outline-check-l' : 'i-bx24-social-github'"/)
  assert.match(code, /<B24Button trailing-icon="i-bx24-social-github" \/>/)
  assert.match(code, /<B24Icon name="i-bx24-outline-check-l" class="size-5" \/>/)
  assert.match(code, /const label = 'CheckLIcon'/, 'string literals stay untouched')
})

test('codemod supports @iconify/vue output', () => {
  const { code } = run(['--component', 'Icon', '--prefix', 'bx24:', '--name-prop', 'icon'])
  assert.match(code, /<Icon icon="bx24:outline-check-l" class="size-5" \/>/)
})

test('lookup prints the new name', () => {
  const out = execFileSync(process.execPath, [BIN, 'lookup', '@bitrix24/b24icons-vue/outline/CheckLIcon'], { encoding: 'utf8' })
  assert.match(out, /outline\/CheckLIcon → i-bx24-outline-check-l/)
})

test('a quoted old name is not reported as a leftover reference; props get a b24-ui#69 note', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bx24-migrate-'))
  fs.writeFileSync(path.join(dir, 'a.ts'), `import GitHubIcon from '@bitrix24/b24icons-vue/social/GitHubIcon'
export const pick = (n: string) => { switch (n) { case 'GitHubIcon': return GitHubIcon } }
export const item = { icon: GitHubIcon }
`)
  const out = execFileSync(process.execPath, [BIN, dir, '--write'], { encoding: 'utf8' })
  const code = fs.readFileSync(path.join(dir, 'a.ts'), 'utf8')
  assert.match(code, /case 'GitHubIcon': return 'i-bx24-social-github'/)
  assert.doesNotMatch(out, /still referenced/)
  assert.match(out, /bx-shef\/b24-ui#69/)
})

test('reports render functions, <component :is>, comments, leftovers; skips missing folders', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bx24-migrate-'))
  fs.writeFileSync(path.join(dir, 'a.vue'), `<script setup>
import { h } from 'vue'
// import OldIcon from '@bitrix24/b24icons-vue/outline/OldIcon'
import GitHubIcon from '@bitrix24/b24icons-vue/social/GitHubIcon'
import CheckLIcon from '@bitrix24/b24icons-vue/outline/CheckLIcon'
const items = [{ icon: CheckLIcon }]
// GitHubIcon is drawn by a render function
const Logo = () => h(GitHubIcon, { class: 'size-6' })
</script>
<template><component :is="items[0].icon" /><Logo /></template>
`)
  const out = execFileSync(process.execPath, [BIN, dir, path.join(dir, 'missing'), '--component', 'Icon', '--prefix', 'bx24:', '--name-prop', 'icon'], { encoding: 'utf8' })
  assert.match(out, /missing: no such file or directory, skipped/)
  assert.match(out, /h\(GitHubIcon, …\) in a render function/)
  assert.match(out, /<component :is/)
  assert.match(out, /GitHubIcon is mentioned in a comment/)
  assert.match(out, /1 commented-out import/)
  assert.doesNotMatch(out, /bx-shef\/b24-ui#69/, 'b24-ui note only for B24Icon')
})
