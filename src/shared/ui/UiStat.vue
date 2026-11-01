<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  label: string
  value: string
  hint?: string
  icon?: Component
  delta?: number | null
  to?: string
}>()
</script>

<template>
  <component
    :is="to ? 'RouterLink' : 'div'"
    :to="to"
    class="group relative flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-xs transition-colors"
    :class="to && 'hover:border-line-strong'"
  >
    <div class="flex items-center justify-between">
      <span class="text-[13px] text-muted">{{ label }}</span>
      <component :is="icon" v-if="icon" class="size-4 text-faint transition-colors group-hover:text-muted" />
    </div>
    <div class="flex items-baseline gap-2">
      <span class="num text-2xl font-semibold tracking-tight text-fg">{{ value }}</span>
      <span
        v-if="delta != null"
        :class="['num text-xs font-medium', delta >= 0 ? 'text-success' : 'text-danger']"
        >{{ delta >= 0 ? '↑' : '↓' }} {{ Math.abs(delta).toFixed(1) }}%</span
      >
    </div>
    <span v-if="hint" class="-mt-1.5 text-xs text-faint">{{ hint }}</span>
  </component>
</template>
