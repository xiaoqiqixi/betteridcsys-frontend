<script setup lang="ts">
import { CheckCircle2, Info, X, XCircle } from '@lucide/vue'
import { toasts, useToast } from '@/shared/composables/toast'

const { dismiss } = useToast()
</script>

<template>
  <div
    class="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-[min(92vw,360px)] flex-col gap-2"
    aria-live="polite"
  >
    <TransitionGroup
      enter-from-class="opacity-0 translate-y-2"
      enter-active-class="transition duration-200"
      leave-to-class="opacity-0"
      leave-active-class="transition duration-150"
    >
      <div
        v-for="t in toasts.items"
        :key="t.id"
        class="pointer-events-auto flex items-start gap-3 rounded-lg border border-line bg-elevated p-3.5 shadow-lg"
      >
        <CheckCircle2 v-if="t.tone === 'success'" class="mt-0.5 size-4 shrink-0 text-success" />
        <XCircle v-else-if="t.tone === 'error'" class="mt-0.5 size-4 shrink-0 text-danger" />
        <Info v-else class="mt-0.5 size-4 shrink-0 text-info" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-fg">{{ t.title }}</p>
          <p v-if="t.description" class="mt-0.5 text-[13px] text-muted">{{ t.description }}</p>
        </div>
        <button class="text-faint hover:text-fg" :aria-label="$t('common.close')" @click="dismiss(t.id)">
          <X class="size-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
