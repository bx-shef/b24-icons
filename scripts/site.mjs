/**
 * Builds the public catalog into site-dist/ (served by GitHub Pages).
 * Run after `pnpm build`: node scripts/site.mjs
 */
import fs from 'node:fs/promises'
import { resolve } from 'node:path'
import { ROOT } from './lib/config.mjs'

const OUT = resolve(ROOT, 'site-dist')
const JSON_PKG = resolve(ROOT, 'packages/icons-json')

await fs.rm(OUT, { recursive: true, force: true })
await fs.mkdir(OUT, { recursive: true })
await fs.copyFile(resolve(ROOT, 'site/index.html'), resolve(OUT, 'index.html'))
for (const file of ['icons.json', 'metadata.json', 'info.json']) {
  await fs.copyFile(resolve(JSON_PKG, file), resolve(OUT, file))
}
await fs.writeFile(resolve(OUT, '.nojekyll'), '')
console.log('✓ site-dist')
