<script setup lang="ts">
import { RESOURCES } from '~/utils/resources'

const config = useRuntimeConfig()
const sites = RESOURCES.filter(r => r.to.startsWith('http') && !r.to.includes('npmjs'))
</script>

<template>
  <B24Footer>
    <template #left>
      <div class="text-sm text-(--tai-text-2) space-y-1">
        <p class="flex flex-wrap gap-x-4 gap-y-1">
          <a v-for="r in sites" :key="r.to" class="vsk-link" :href="r.to" target="_blank">{{ r.label }}</a>
          <a class="vsk-link" href="https://github.com/bx-shef/b24-icons" target="_blank">GitHub</a>
        </p>
        <p>Иконки основаны на bitrix24/b24icons (MIT). Коллекция и каталог — bx-shef.</p>
      </div>
    </template>
    <template #right>
      <!-- Отзыв согласия на cookie (cookie-consent.js): только когда на сайте есть Метрика -->
      <button
        v-if="config.public.yandexMetrikaId"
        type="button"
        data-cookie-settings
        class="text-sm text-(--tai-text-2) hover:underline"
      >
        Настроить cookie
      </button>
    </template>
  </B24Footer>
</template>
