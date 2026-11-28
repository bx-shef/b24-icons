<script setup lang="ts">
import GitHubIcon from '@bitrix24/b24icons-vue/social/GitHubIcon'
</script>

<template>
  <B24Header
    :toggle="false"
    class="bg-(--ui-color-accent-soft-element-violet)/40 dark:bg-(--ui-color-copilot-bg-content-3)/40 backdrop-blur-md"
    :b24ui="{ right: 'gap-1 sm:gap-3' }"
  >
    <template #left>
      <NuxtLink to="/" class="flex items-center gap-2 font-semibold text-lg" aria-label="bx24 icons — на главную">
        <Cornflower class="size-7" />
        <span>bx24 <span class="vsk-gradient-text">icons</span></span>
      </NuxtLink>
    </template>

    <template #right>
      <B24Button
        to="https://b24-ui.bx-shef.by/docs/getting-started/integrations/icons/nuxt/"
        target="_blank"
        color="air-tertiary"
        size="sm"
        label="b24-ui"
        class="hidden sm:inline-flex"
      />
      <B24Button
        to="https://www.npmjs.com/package/@bxshefby/icons-json"
        target="_blank"
        color="air-tertiary"
        size="sm"
        label="npm"
        class="hidden sm:inline-flex"
      />
      <B24ColorModeButton />
      <B24Button
        aria-label="bx24 icons на GitHub"
        :icon="GitHubIcon"
        to="https://github.com/bx-shef/b24-icons"
        target="_blank"
        size="sm"
      />
    </template>
  </B24Header>
</template>
