<script setup lang="ts">
withDefaults(defineProps<{ title?: string; description?: string; padded?: boolean; flush?: boolean }>(), {
  padded: true,
})
</script>

<template>
  <section class="rounded-lg border border-line bg-surface shadow-xs">
    <header
      v-if="title || $slots.header || $slots.actions"
      class="flex items-start justify-between gap-4 border-b border-line px-5 py-4"
    >
      <div class="min-w-0">
        <slot name="header">
          <h2 class="text-[15px] font-semibold text-fg">{{ title }}</h2>
          <p v-if="description" class="mt-0.5 text-[13px] text-muted">{{ description }}</p>
        </slot>
      </div>
      <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2"><slot name="actions" /></div>
    </header>
    <div :class="flush ? '' : padded ? 'p-5' : ''"><slot /></div>
    <footer v-if="$slots.footer" class="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
      <slot name="footer" />
    </footer>
  </section>
</template>
