/**
 * Local catalog editor: `pnpm admin` → http://127.0.0.1:4224
 *
 * Reads the built collection (runs the build if needed) and edits data/catalog.json:
 *   { "categories": { "<title>": ["<icon>", ...] }, "hidden": ["<icon>", ...] }
 * Works only on this machine (bound to 127.0.0.1); commit data/catalog.json afterwards.
 */
import http from 'node:http'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { ROOT, DATA_DIR } from '../scripts/lib/config.mjs'

const PORT = Number(process.env.PORT || 4224)
const HOST = '127.0.0.1'
const ICONS_FILE = resolve(ROOT, 'packages/icons-json/icons.json')
const CATALOG_FILE = resolve(DATA_DIR, 'catalog.json')
const KEYWORDS_FILE = resolve(DATA_DIR, 'keywords.json')
const PAGE_FILE = resolve(ROOT, 'admin/index.html')

if (!existsSync(ICONS_FILE)) {
  console.log('Collection is not built yet, running the build…')
  execFileSync(process.execPath, [resolve(ROOT, 'scripts/build.mjs')], { stdio: 'inherit' })
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {
    return fallback
  }
}

async function readCatalog() {
  try {
    return JSON.parse(await fs.readFile(CATALOG_FILE, 'utf8'))
  } catch {
    return { categories: {}, hidden: [] }
  }
}

/** Stable, diff-friendly form: sorted names, categories in the order given by the editor. */
function normalizeCatalog(input, known) {
  const categories = {}
  for (const [title, names] of Object.entries(input?.categories ?? {})) {
    const clean = String(title).trim()
    if (!clean) continue
    categories[clean] = [...new Set(names)].filter(n => known.has(n)).sort()
  }
  const hidden = [...new Set(input?.hidden ?? [])].filter(n => known.has(n)).sort()
  return { categories, hidden }
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' })
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body))
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}`)
    if (req.method === 'GET' && url.pathname === '/') {
      return send(res, 200, await fs.readFile(PAGE_FILE), 'text/html; charset=utf-8')
    }
    if (req.method === 'GET' && url.pathname === '/api/icons') {
      return send(res, 200, await fs.readFile(ICONS_FILE))
    }
    if (req.method === 'GET' && url.pathname === '/api/catalog') {
      return send(res, 200, await readCatalog())
    }
    if (req.method === 'GET' && url.pathname === '/api/keywords') {
      return send(res, 200, await readJson(KEYWORDS_FILE, {}))
    }
    if (req.method === 'PUT' && (url.pathname === '/api/catalog' || url.pathname === '/api/keywords')) {
      // same-origin only: refuse requests a foreign page could send from the browser
      const origin = req.headers.origin
      if (origin && origin !== `http://${HOST}:${PORT}` && origin !== `http://localhost:${PORT}`) {
        return send(res, 403, { error: 'forbidden origin' })
      }
      let raw = ''
      for await (const chunk of req) raw += chunk
      if (url.pathname === '/api/keywords') {
        // { base, keywords: [] } — one group at a time, the rest of the file is kept as is
        const { base, keywords } = JSON.parse(raw)
        if (typeof base !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(base) || !Array.isArray(keywords)) {
          return send(res, 400, { error: 'bad request' })
        }
        const all = await readJson(KEYWORDS_FILE, {})
        const clean = [...new Set(keywords.map(k => String(k).trim().toLowerCase()).filter(Boolean))]
        if (clean.length) all[base] = clean
        else delete all[base]
        const sorted = Object.fromEntries(Object.entries(all).sort(([a], [b]) => a.localeCompare(b)))
        await fs.writeFile(KEYWORDS_FILE, JSON.stringify(sorted, null, 2) + '\n')
        return send(res, 200, { base, keywords: clean })
      }
      const icons = JSON.parse(await fs.readFile(ICONS_FILE, 'utf8'))
      const known = new Set([...Object.keys(icons.icons), ...Object.keys(icons.aliases ?? {})])
      const catalog = normalizeCatalog(JSON.parse(raw), known)
      await fs.mkdir(DATA_DIR, { recursive: true })
      await fs.writeFile(CATALOG_FILE, JSON.stringify(catalog, null, 2) + '\n')
      return send(res, 200, catalog)
    }
    send(res, 404, { error: 'not found' })
  } catch (error) {
    send(res, 500, { error: error.message })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`bx24 catalog editor: http://${HOST}:${PORT}`)
  console.log('Edits are saved to data/catalog.json. Rebuild with `pnpm build` to apply them to the package.')
})
