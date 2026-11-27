/**
 * Builds the public catalog into site-dist/ (the image deploy/Dockerfile serves it).
 * Run after `pnpm build`: node scripts/site.mjs
 * SITE_URL (e.g. https://b24-icons.bx-shef.by) adds canonical/og tags, sitemap.xml and robots.txt.
 */
import fs from 'node:fs/promises'
import { resolve } from 'node:path'
import { ROOT } from './lib/config.mjs'

const OUT = resolve(ROOT, 'site-dist')
const JSON_PKG = resolve(ROOT, 'packages/icons-json')
const SITE_URL = (process.env.SITE_URL || '').trim().replace(/\/+$/, '')

if (SITE_URL && !/^https:\/\/[a-z0-9.-]+$/i.test(SITE_URL)) {
  console.error(`✗ SITE_URL must look like https://example.com, got "${SITE_URL}"`)
  process.exit(1)
}

await fs.rm(OUT, { recursive: true, force: true })
await fs.mkdir(OUT, { recursive: true })

let html = await fs.readFile(resolve(ROOT, 'site/index.html'), 'utf8')
if (SITE_URL) {
  const head = [
    `<link rel="canonical" href="${SITE_URL}/">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${SITE_URL}/">`,
    `<meta property="og:title" content="bx24 icons">`,
    `<meta property="og:description" content="Иконки Bitrix24 как коллекция Iconify bx24: поиск, темы, имена для Nuxt, Vue, React и SVG.">`
  ].join('\n')
  html = html.replace('</head>', `${head}\n</head>`)
  await fs.writeFile(resolve(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}/</loc></url></urlset>\n`)
  await fs.writeFile(resolve(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`)
}
await fs.writeFile(resolve(OUT, 'index.html'), html)
for (const file of ['icons.json', 'metadata.json', 'info.json']) {
  await fs.copyFile(resolve(JSON_PKG, file), resolve(OUT, file))
}
console.log(`✓ site-dist${SITE_URL ? ` (${SITE_URL})` : ''}`)
