// Данные одной иконки для страницы /icons/<имя>. Работает только при генерации сайта (nuxt generate):
// ответ попадает в payload страницы, на сервере каталога API нет (статический nginx).
import { getIconData, iconToSVG, iconToHTML } from '@iconify/utils'
import type { IconifyJSON } from '@iconify/types'
import type { Bx24SearchIndex } from '@bxshefby/icons-json/search'
import iconsJson from '@bxshefby/icons-json/icons.json'
import searchJson from '@bxshefby/icons-json/search.json'

const icons = iconsJson as IconifyJSON
const index = searchJson as Bx24SearchIndex

export default defineEventHandler((event) => {
  const name = getRouterParam(event, 'name') ?? ''
  const data = getIconData(icons, name)
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Icon not found' })
  const r = iconToSVG(data, { height: 'auto' })
  const group = index.groups.find(g => g.variants.some(v => v.name === name)) ?? null
  return {
    name,
    width: data.width,
    height: data.height,
    // как файл /svg/<имя>.svg: реальный размер, currentColor
    svg: iconToHTML(r.body, r.attributes),
    group
  }
})
