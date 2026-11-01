<script setup lang="ts">
export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
withDefaults(defineProps<{ tone?: Tone; dot?: boolean; pulse?: boolean }>(), { tone: 'neutral' })
</script>

<template>
  <span
    :class="[
      'inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap',
      {
        'bg-surface-2 text-fg-2 ring-1 ring-line ring-inset': tone === 'neutral',
        'bg-primary-soft text-primary': tone === 'primary',
        'bg-success-soft text-success': tone === 'success',
        'bg-warning-soft text-warning': tone === 'warning',
        'bg-danger-soft text-danger': tone === 'danger',
        'bg-info-soft text-info': tone === 'info',
      },
    ]"
  >
    <span v-if="dot" class="relative flex size-1.5">
      <span v-if="pulse" class="absolute inset-0 animate-ping rounded-full bg-current opacity-60" />
      <span class="relative size-1.5 rounded-full bg-current" />
    </span>
    <slot />
  </span>
</template>
