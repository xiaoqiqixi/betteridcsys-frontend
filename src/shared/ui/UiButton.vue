<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { cx } from '@/shared/lib/cx'
import UiSpinner from './UiSpinner.vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'danger-ghost' | 'link'
    size?: 'xs' | 'sm' | 'md' | 'lg'
    to?: RouteLocationRaw
    href?: string
    type?: 'button' | 'submit' | 'reset'
    loading?: boolean
    disabled?: boolean
    block?: boolean
    square?: boolean
  }>(),
  { variant: 'secondary', size: 'md', type: 'button' },
)

const classes = computed(() =>
  cx(
    'relative inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap select-none',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    {
      'h-7 px-2.5 text-xs': props.size === 'xs' && !props.square,
      'h-8 px-3 text-[13px]': props.size === 'sm' && !props.square,
      'h-9 px-3.5 text-sm': props.size === 'md' && !props.square,
      'h-11 px-5 text-[15px]': props.size === 'lg' && !props.square,
      'size-7': props.size === 'xs' && props.square,
      'size-8': props.size === 'sm' && props.square,
      'size-9': props.size === 'md' && props.square,
      'size-11': props.size === 'lg' && props.square,
      'w-full': props.block,
      'bg-primary text-primary-fg shadow-xs hover:bg-primary-hover': props.variant === 'primary',
      'border border-line bg-surface text-fg shadow-xs hover:border-line-strong hover:bg-surface-2':
        props.variant === 'secondary',
      'border border-line-strong bg-transparent text-fg hover:bg-surface-2': props.variant === 'outline',
      'text-fg-2 hover:bg-surface-2 hover:text-fg': props.variant === 'ghost',
      'bg-danger text-white shadow-xs hover:opacity-90': props.variant === 'danger',
      'text-danger hover:bg-danger-soft': props.variant === 'danger-ghost',
      'h-auto px-0 text-primary hover:underline underline-offset-4': props.variant === 'link',
    },
  ),
)
</script>

<template>
  <RouterLink v-if="to" :to="to" :class="classes" :aria-disabled="disabled || undefined">
    <slot />
  </RouterLink>
  <a v-else-if="href" :href="href" :class="classes" target="_blank" rel="noopener noreferrer"><slot /></a>
  <button
    v-else
    :type="type"
    :class="classes"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <span v-if="loading" class="absolute inset-0 grid place-items-center"><UiSpinner class="size-4" /></span>
    <span :class="['inline-flex items-center gap-2', loading && 'invisible']"><slot /></span>
  </button>
</template>
