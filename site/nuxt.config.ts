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
      htmlAttrs: { lang: 'ru' },
      title: 'bx24 icons — иконки Битрикс24',
      meta: [
        { name: 'description', content: 'Иконки Битрикс24 как коллекция Iconify bx24: поиск по-русски и по-английски, темы, имена для Nuxt, b24-ui, Vue, React и SVG.' }
      ],
      // Keep ?q=&set=&theme=&icon= before Nuxt hydrates the prerendered "/" and drops them
      script: [
        { innerHTML: 'window.__bx24Search=location.search', tagPosition: 'head' },
        // Класс темы до первой отрисовки (без вспышки) — та же логика, что у useColorMode b24-ui
        // (ключ vueuse-color-scheme; нет выбора — системная тема). Копия из docs/nuxt.config.ts bx-shef/b24-ui.
        {
          innerHTML: '(function(){try{var k="vueuse-color-scheme",s=localStorage.getItem(k);if(s==="edge-dark"){s="dark";localStorage.setItem(k,s)}var m=s&&s!=="auto"?s:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"edge-light");if(m==="light")m="edge-light";document.documentElement.classList.add(m)}catch(e){document.documentElement.classList.add("edge-light")}})()',
          tagPosition: 'head'
        }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        ...(siteUrl ? [{ rel: 'canonical', href: `${siteUrl}/` }] : [])
      ]
    }
  },

  runtimeConfig: {
    public: {
      siteUrl,
      // Яндекс Метрика: номер вшивается при генерации (deploy/Dockerfile, секрет YANDEX_METRIKA_ID).
      // Пусто — ни счётчика, ни баннера cookie (plugins/metrika.client.ts).
      yandexMetrikaId: process.env.NUXT_PUBLIC_YANDEX_METRIKA_ID ?? ''
    }
  },


  nitro: {
    prerender: { routes: ['/'], crawlLinks: false }
  },

  compatibilityDate: '2026-11-01'
})
