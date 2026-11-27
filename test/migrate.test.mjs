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
