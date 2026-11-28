/**
 * Search over the bx24 collection. Shared by the public catalog and the b24-ui MCP tool
 * `b24-ui-search-icons`, so both find the same icons.
 *
 *   import index from '@bxshefby/icons-json/search.json'
 *   import { createSearch } from '@bxshefby/icons-json/search'
 *   const search = createSearch(index)
 *   search('корзина', { limit: 10 })
 *
 * No dependencies, works in Node and in the browser.
 */

const SPLIT = /[\s\-_/:.,]+/

/** Lowercase tokens; camelCase is split (`CheckLIcon` → check, l, icon). */
export function tokenize(text) {
  return String(text)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .split(SPLIT)
    .filter(Boolean)
}

/**
 * @param {import('./search').Bx24SearchIndex} index
 */
export function createSearch(index) {
  const entries = index.groups.map((group) => {
    const nameWords = tokenize(group.base)
    const keywords = group.keywords.map(k => k.toLowerCase().replace(/ё/g, 'е'))
    const themes = group.themes.map(t => t.toLowerCase().replace(/ё/g, 'е'))
    const legacy = group.legacy.map(l => l.toLowerCase())
    const legacyShort = group.legacy.map(l => l.split('/').pop().toLowerCase())
    const names = group.variants.map(v => v.name)
    return { group, nameWords, keywords, themes, legacy, legacyShort, names }
  })

  /** Score of one query token against an entry, 0 when it does not match. */
  function tokenScore(e, token) {
    if (e.nameWords.includes(token)) return 40
    // the first keywords describe the icon best
    const k = e.keywords.indexOf(token)
    if (k !== -1) return 30 + Math.max(0, 8 - k)
    if (e.nameWords.some(w => w.startsWith(token))) return 20
    if (e.keywords.some(k => k.split(' ').some(w => w.startsWith(token)))) return 15
    if (e.themes.some(t => t.split(' ').some(w => w.startsWith(token)))) return 10
    if (token.length >= 3 && e.group.base.includes(token)) return 5
    return 0
  }

  /**
   * @param {string} query
   * @param {{ limit?: number, set?: string, theme?: string }} [options]
   */
  return function search(query, options = {}) {
    const { limit = 64, set, theme } = options
    const raw = String(query ?? '').trim()
    const q = raw.toLowerCase().replace(/^i-bx24-|^bx24:/, '').replace(/ё/g, 'е')
    const tokens = tokenize(q)
    const results = []

    for (const e of entries) {
      if (set && !e.group.variants.some(v => v.set === set)) continue
      if (theme && !e.group.themes.includes(theme)) continue

      let score = 0
      if (!tokens.length) {
        score = 1
      } else if (e.names.includes(q) || e.group.base === q) {
        score = 1000
      } else if (e.legacy.includes(q.replace(/^@bitrix24\/b24icons-vue\//, '')) || e.legacyShort.includes(q)) {
        score = 900
      } else {
        for (const token of tokens) {
          const s = tokenScore(e, token)
          if (!s) {
            score = 0
            break
          }
          score += s
        }
        if (score && e.group.base.startsWith(tokens.join('-'))) score += 25
        // the more generic (shorter) name wins among equal matches
        if (score) score += Math.max(0, 6 - e.nameWords.length)
      }
      if (score) results.push({ score, group: e.group })
    }

    results.sort((a, b) => b.score - a.score || a.group.base.localeCompare(b.group.base))
    return {
      query: raw,
      total: results.length,
      results: results.slice(0, limit).map(({ group }) => ({
        ...group,
        name: preferredName(group, set)
      }))
    }
  }
}

/** Default variant: the requested set, else outline, else the first; largest size first. */
export function preferredName(group, set) {
  const order = ['l', '', 'm', 's', 'xs']
  const variants = [...group.variants].sort((a, b) => order.indexOf(a.size) - order.indexOf(b.size))
  const pick = (set && variants.find(v => v.set === set))
    || variants.find(v => v.set === 'outline')
    || variants[0]
  return pick.name
}
