// Публичный каталог иконок bx24 на b24-ui (bx-shef/b24-icons#20). Статическая генерация:
// `pnpm site` → site-dist/ (образ deploy/Dockerfile). Данные коллекции — в public/data
// (кладёт scripts/site.mjs из packages/icons-json), страница читает их в браузере.
const siteUrl = (process.env.SITE_URL || '').replace(/\/+$/, '')

export default defineNuxtConfig({
  modules: ['@bitrix24/b24ui-nuxt'],

  devtools: { enabled: false },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'ru', class: 'edge-dark' },
      title: 'bx24 icons — иконки Битрикс24',
      meta: [
        { name: 'description', content: 'Иконки Битрикс24 как коллекция Iconify bx24: поиск по-русски и по-английски, темы, имена для Nuxt, b24-ui, Vue, React и SVG.' }
      ],
      // Keep ?q=&set=&theme=&icon= before Nuxt hydrates the prerendered "/" and drops them
      script: [{ innerHTML: 'window.__bx24Search=location.search', tagPosition: 'head' }],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        ...(siteUrl ? [{ rel: 'canonical', href: `${siteUrl}/` }] : [])
      ]
    }
  },

  runtimeConfig: {
    public: { siteUrl }
  },

  colorMode: {
    preference: 'dark'
  },

  nitro: {
    prerender: { routes: ['/'], crawlLinks: false }
  },

  compatibilityDate: '2026-11-01'
})
