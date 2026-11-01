<script setup lang="ts">
const model = defineModel<string>()
defineProps<{ invalid?: boolean; rows?: number }>()
</script>

<template>
  <textarea
    v-model="model"
    :rows="rows ?? 4"
    :aria-invalid="invalid || undefined"
    :class="[
      'w-full resize-y rounded-md border bg-surface px-3 py-2 text-sm text-fg shadow-xs transition-[border-color,box-shadow] outline-none placeholder:text-faint',
      'focus:border-primary focus:ring-3 focus:ring-primary-soft',
      invalid ? 'border-danger' : 'border-line hover:border-line-strong',
    ]"
  />
</template>
