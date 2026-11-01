<script setup lang="ts" generic="T extends string | number">
import { Check, ChevronDown } from '@lucide/vue'
import { computed } from 'vue'
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'

export interface Option<V> {
  value: V
  label: string
  hint?: string
  disabled?: boolean
}
defineOptions({ inheritAttrs: false })
const model = defineModel<T>()
withDefaults(
  defineProps<{
    options: Option<T>[]
    placeholder?: string
    invalid?: boolean
    size?: 'sm' | 'md'
    id?: string
    disabled?: boolean
  }>(),
  {
    size: 'md',
  },
)
// Reka UI reserves the empty string for "no selection"; map it to a sentinel so '' can be a real choice (e.g. "All").
const EMPTY = '__empty__'
const enc = (v: T | undefined) => (v === '' ? EMPTY : v)
const inner = computed({
  get: () => enc(model.value) as string | number | undefined,
  set: (v) => (model.value = (v === EMPTY ? '' : v) as T),
})
</script>

<template>
  <SelectRoot v-model="inner as any" :disabled="disabled">
    <SelectTrigger
      v-bind="$attrs"
      :id="id"
      :aria-invalid="invalid || undefined"
      :class="[
        'flex w-full items-center justify-between gap-2 rounded-md border bg-surface px-3 text-left shadow-xs transition-[border-color,box-shadow] outline-none',
        'focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary-soft data-[placeholder]:text-faint',
        invalid ? 'border-danger' : 'border-line hover:border-line-strong',
        size === 'sm' ? 'h-8 text-[13px]' : 'h-9 text-sm',
      ]"
    >
      <SelectValue :placeholder="placeholder ?? $t('common.select')" class="truncate" />
      <ChevronDown class="size-4 shrink-0 text-muted" />
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        position="popper"
        :side-offset="6"
        class="z-[60] max-h-[min(var(--reka-select-content-available-height),360px)] min-w-[var(--reka-select-trigger-width)] overflow-hidden rounded-lg border border-line bg-elevated p-1 shadow-md data-[state=open]:animate-pop"
      >
        <SelectViewport>
          <SelectItem
            v-for="o in options"
            :key="String(o.value)"
            :value="enc(o.value) as any"
            :disabled="o.disabled"
            class="relative flex cursor-pointer items-center gap-2 rounded-md py-2 pr-8 pl-2.5 text-sm text-fg outline-none select-none data-[disabled]:opacity-40 data-[highlighted]:bg-surface-2"
          >
            <div class="min-w-0">
              <SelectItemText>{{ o.label }}</SelectItemText>
              <div v-if="o.hint" class="truncate text-xs text-muted">{{ o.hint }}</div>
            </div>
            <SelectItemIndicator class="absolute right-2.5"
              ><Check class="size-4 text-primary"
            /></SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
