<script setup lang="ts">
import { ru } from '@bitrix24/b24ui-nuxt/locale'

const config = useRuntimeConfig()
useSeoMeta({
  ogTitle: 'bx24 icons — иконки Битрикс24',
  ogDescription: 'Иконки Битрикс24 как коллекция Iconify bx24: поиск, темы, имена для Nuxt, b24-ui, Vue, React и SVG.',
  ogUrl: config.public.siteUrl ? `${config.public.siteUrl}/` : undefined,
  ogType: 'website'
})
</script>

<template>
  <B24App :locale="ru">
    <AppHeader />
    <B24Main>
      <NuxtPage />
    </B24Main>
    <AppFooter />
  </B24App>
</template>
