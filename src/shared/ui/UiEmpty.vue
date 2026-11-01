<script setup lang="ts">
import type { Component } from 'vue'
import { Inbox } from '@lucide/vue'

withDefaults(defineProps<{ title: string; description?: string; icon?: Component; compact?: boolean }>(), {
  icon: () => Inbox,
})
</script>

<template>
  <div
    :class="[
      'relative flex flex-col items-center justify-center overflow-hidden text-center',
      compact ? 'px-4 py-8' : 'px-6 py-16',
    ]"
  >
    <div class="bg-grid mask-radial pointer-events-none absolute inset-0 opacity-70" />
    <div
      class="relative mb-4 grid size-11 place-items-center rounded-xl border border-line bg-surface shadow-xs"
    >
      <component :is="icon" class="size-5 text-muted" />
    </div>
    <h3 class="relative text-[15px] font-semibold text-fg">{{ title }}</h3>
    <p v-if="description" class="relative mt-1 max-w-sm text-[13px] text-muted">{{ description }}</p>
    <div v-if="$slots.default" class="relative mt-5 flex gap-2"><slot /></div>
  </div>
</template>
