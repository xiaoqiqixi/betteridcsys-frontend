<script setup lang="ts">
import type { Component } from 'vue'
import { DropdownMenuRoot, DropdownMenuTrigger } from 'reka-ui'
import { defineAsyncComponent, ref } from 'vue'
const LazyContent = defineAsyncComponent(() => import('./UiDropdownContent.vue'))
const open = ref(false)

export interface MenuItem {
  label?: string
  icon?: Component
  danger?: boolean
  disabled?: boolean
  separator?: boolean
  heading?: boolean
  onSelect?: () => void
}
withDefaults(defineProps<{ items: MenuItem[]; align?: 'start' | 'end'; width?: string }>(), {
  align: 'end',
  width: 'w-52',
})
</script>

<template>
  <DropdownMenuRoot v-model:open="open" :modal="false">
    <DropdownMenuTrigger as-child><slot /></DropdownMenuTrigger>
    <LazyContent v-if="open" :items="items" :align="align" :width="width">
      <template #header><slot name="header" /></template>
    </LazyContent>
  </DropdownMenuRoot>
</template>
