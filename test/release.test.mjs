// Сторож схемы выпуска: версии в ногу, условия и окружение публикации на месте.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
const json = file => JSON.parse(read(file))
const PACKAGES = ['icons-json', 'icons-svg', 'icons-migrate']

test('all packages share the version from the release manifest', () => {
  const version = json('.release-please-manifest.json')['.']
  assert.equal(json('package.json').version, version)
  for (const p of PACKAGES) assert.equal(json(`packages/${p}/package.json`).version, version, p)
})

test('release-please bumps every package', () => {
  const config = json('release-please-config.json')
  const paths = config.packages['.']['extra-files'].map(f => f.path)
  for (const p of PACKAGES) assert.ok(paths.includes(`packages/${p}/package.json`), p)
})

test('packages publish publicly with provenance from this repository', () => {
  for (const p of PACKAGES) {
    const pkg = json(`packages/${p}/package.json`)
    assert.equal(pkg.name, `@bxshefby/${p}`)
    assert.equal(pkg.publishConfig.access, 'public')
    assert.equal(pkg.publishConfig.provenance, true)
    assert.match(pkg.repository.url, /github\.com\/bx-shef\/b24-icons\.git$/)
  }
})

test('workflows are gated and publish from the npm-release environment', () => {
  const publish = read('.github/workflows/npm-publish.yml')
  const release = read('.github/workflows/release-please.yml')
  for (const wf of [publish, release]) {
    assert.match(wf, /github\.repository == 'bx-shef\/b24-icons' && vars\.NPM_RELEASE == 'true'/)
  }
  assert.match(publish, /environment: npm-release/)
  assert.match(publish, /startsWith\(github\.ref, 'refs\/tags\/v'\)/)
  assert.match(publish, /--provenance/)
  assert.match(release, /gh workflow run npm-publish\.yml/)
  // id-token только у job публикации
  assert.equal(publish.match(/id-token: write/g).length, 1)
})

test('actions are pinned by SHA', () => {
  for (const file of fs.readdirSync(new URL('../.github/workflows', import.meta.url))) {
    for (const [, ref] of read(`.github/workflows/${file}`).matchAll(/uses:\s*[\w./-]+@(\S+)/g)) {
      assert.match(ref, /^[0-9a-f]{40}$/, `${file}: ${ref}`)
    }
  }
})

test('deploy/install-server.sh is valid bash', async () => {
  const { execFileSync } = await import('node:child_process')
  execFileSync('bash', ['-n', new URL('../deploy/install-server.sh', import.meta.url).pathname])
})
