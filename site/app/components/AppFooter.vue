<script setup lang="ts">
const config = useRuntimeConfig()
</script>

<template>
  <B24Footer>
    <template #left>
      <p class="text-sm text-(--b24ui-typography-description-color)">
        © 2026 ООО «БэИксШефБай». Основано на Bitrix24 UI и Nuxt UI, лицензия MIT.
        Иконки — из <a class="vsk-link" href="https://github.com/bitrix24/b24icons" target="_blank">bitrix24/b24icons</a> (MIT).
        Коллекция и каталог — <a class="vsk-link" href="https://github.com/bx-shef/b24-icons" target="_blank">bx-shef/b24-icons</a>.
      </p>
    </template>
    <template #right>
      <!-- Отзыв согласия на cookie (cookie-consent.js): только когда на сайте есть Метрика -->
      <button
        v-if="config.public.yandexMetrikaId"
        type="button"
        data-cookie-settings
        class="text-sm text-(--b24ui-typography-description-color) hover:underline"
      >
        Настроить cookie
      </button>
    </template>
  </B24Footer>
</template>
