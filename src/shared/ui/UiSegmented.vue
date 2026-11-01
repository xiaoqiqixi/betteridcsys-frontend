<script setup lang="ts" generic="T extends string">
const model = defineModel<T>({ required: true })
withDefaults(defineProps<{ options: { value: T; label: string; count?: number }[]; size?: 'sm' | 'md' }>(), {
  size: 'md',
})
</script>

<template>
  <div
    role="tablist"
    class="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-line bg-surface-2 p-0.5"
  >
    <button
      v-for="o in options"
      :key="o.value"
      role="tab"
      type="button"
      :aria-selected="model === o.value"
      :class="[
        'inline-flex items-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors',
        size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
        model === o.value ? 'bg-surface text-fg shadow-xs ring-1 ring-line' : 'text-muted hover:text-fg',
      ]"
      @click="model = o.value"
    >
      {{ o.label }}
      <span v-if="o.count != null" class="num rounded-full bg-line px-1.5 text-[11px] text-fg-2">{{
        o.count
      }}</span>
    </button>
  </div>
</template>
