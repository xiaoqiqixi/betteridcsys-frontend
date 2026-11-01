<script setup lang="ts">
import { cx } from '@/shared/lib/cx'

defineOptions({ inheritAttrs: false })
const model = defineModel<string | number | null>()
withDefaults(defineProps<{ invalid?: boolean; size?: 'sm' | 'md' | 'lg'; mono?: boolean }>(), { size: 'md' })
</script>

<template>
  <div
    :class="
      cx(
        'group flex w-full items-center gap-2 rounded-md border bg-surface px-3 shadow-xs transition-[border-color,box-shadow]',
        'focus-within:border-primary focus-within:ring-3 focus-within:ring-primary-soft',
        invalid ? 'border-danger' : 'border-line hover:border-line-strong',
        { 'h-8 text-[13px]': size === 'sm', 'h-9 text-sm': size === 'md', 'h-11 text-[15px]': size === 'lg' },
        $attrs.class as string,
      )
    "
  >
    <span v-if="$slots.prefix" class="flex shrink-0 items-center text-muted"><slot name="prefix" /></span>
    <input
      v-bind="{ ...$attrs, class: undefined }"
      v-model="model"
      :aria-invalid="invalid || undefined"
      :class="
        cx(
          'h-full min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-faint',
          mono && 'font-mono',
        )
      "
    />
    <span v-if="$slots.suffix" class="flex shrink-0 items-center text-muted"><slot name="suffix" /></span>
  </div>
</template>
