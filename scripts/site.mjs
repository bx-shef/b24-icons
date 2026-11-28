/**
 * Builds the public catalog (Nuxt app in site/, bx-shef/b24-icons#20) into site-dist/.
 * Run after `pnpm build`: node scripts/site.mjs
 *
 * 1. copies the collection into site/public/data (the page fetches it) and one file per icon
 *    into site/public/svg/<name>.svg (links, MCP previews);
 * 2. `nuxt generate` in site/;
 * 3. copies site/.output/public to site-dist/, adds sitemap.xml and robots.txt when SITE_URL is set.
 */
import fs from 'node:fs/promises'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { getIconData, iconToSVG, iconToHTML } from '@iconify/utils'
import { ROOT } from './lib/config.mjs'

const SITE = resolve(ROOT, 'site')
const OUT = resolve(ROOT, 'site-dist')
const JSON_PKG = resolve(ROOT, 'packages/icons-json')
const SITE_URL = (process.env.SITE_URL || '').trim().replace(/\/+$/, '')

if (SITE_URL && !/^https:\/\/[a-z0-9.-]+$/i.test(SITE_URL)) {
  console.error(`✗ SITE_URL must look like https://example.com, got "${SITE_URL}"`)
  process.exit(1)
}

// 1. data
const data = resolve(SITE, 'public/data')
const svgDir = resolve(SITE, 'public/svg')
await fs.rm(data, { recursive: true, force: true })
await fs.rm(svgDir, { recursive: true, force: true })
await fs.mkdir(data, { recursive: true })
await fs.mkdir(svgDir, { recursive: true })
for (const file of ['icons.json', 'search.json', 'metadata.json', 'info.json']) {
  await fs.copyFile(resolve(JSON_PKG, file), resolve(data, file))
}
const icons = JSON.parse(await fs.readFile(resolve(JSON_PKG, 'icons.json'), 'utf8'))
for (const name of Object.keys(icons.icons)) {
  const r = iconToSVG(getIconData(icons, name))
  await fs.writeFile(resolve(svgDir, `${name}.svg`), iconToHTML(r.body, { xmlns: 'http://www.w3.org/2000/svg', ...r.attributes }) + '\n')
}

// 2. nuxt generate
execFileSync('pnpm', ['--dir', SITE, 'exec', 'nuxt', 'generate'], {
  stdio: 'inherit',
  env: { ...process.env, SITE_URL, NUXT_TELEMETRY_DISABLED: '1' }
})

// 3. output
await fs.rm(OUT, { recursive: true, force: true })
await fs.cp(resolve(SITE, '.output/public'), OUT, { recursive: true })
if (SITE_URL) {
  await fs.writeFile(resolve(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}/</loc></url></urlset>\n`)
  await fs.writeFile(resolve(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`)
}
console.log(`✓ site-dist${SITE_URL ? ` (${SITE_URL})` : ''}`)
