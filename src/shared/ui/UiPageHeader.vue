<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import type { RouteLocationRaw } from 'vue-router'

defineProps<{ title: string; description?: string; back?: RouteLocationRaw; backLabel?: string }>()
</script>

<template>
  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div class="min-w-0">
      <RouterLink
        v-if="back"
        :to="back"
        class="mb-3 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg"
      >
        <ArrowLeft class="size-3.5" />{{ backLabel ?? $t('common.back') }}
      </RouterLink>
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="truncate text-[22px] font-semibold tracking-tight text-fg">{{ title }}</h1>
        <slot name="badges" />
      </div>
      <p v-if="description" class="mt-1 text-sm text-muted">{{ description }}</p>
      <slot name="meta" />
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
