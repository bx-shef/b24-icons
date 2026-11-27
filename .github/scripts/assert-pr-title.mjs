#!/usr/bin/env node
// Проверяет, что заголовок PR — conventional commit, который поймёт release-please.
// Заголовок читается из переменной окружения PR_TITLE (не из командной строки: это чужой текст).
const TYPES = ['feat', 'fix', 'perf', 'revert', 'security', 'deps', 'refactor', 'build', 'docs', 'test', 'ci', 'chore', 'style']
const title = (process.env.PR_TITLE ?? '').trim()
const re = new RegExp(`^(${TYPES.join('|')})(\\([\\w./-]+\\))?!?: \\S.*$`)
if (!re.test(title)) {
  console.error(`::error::Заголовок PR не в формате conventional commits: "${title}"`)
  console.error(`Нужно: <тип>(<область>)?: <описание>, тип — один из: ${TYPES.join(', ')}`)
  process.exit(1)
}
console.log(`OK: ${title}`)
