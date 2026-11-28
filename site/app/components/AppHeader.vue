<script setup lang="ts">
import GitHubIcon from '@bitrix24/b24icons-vue/social/GitHubIcon'
import { RESOURCES } from '~/utils/resources'

const items = RESOURCES.map(r => ({
  label: r.label,
  description: r.description,
  to: r.to,
  target: r.current ? undefined : '_blank'
}))
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
      <B24DropdownMenu :items="items" :content="{ align: 'end' }">
        <B24Button color="air-tertiary" size="sm" label="Ресурсы" use-dropdown />
      </B24DropdownMenu>
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
