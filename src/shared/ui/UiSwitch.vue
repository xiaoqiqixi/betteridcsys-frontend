<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'

const model = defineModel<boolean>({ default: false })
defineProps<{ disabled?: boolean; label?: string; description?: string; id?: string }>()
</script>

<template>
  <label
    class="flex cursor-pointer items-start justify-between gap-4"
    :class="disabled && 'cursor-not-allowed opacity-60'"
  >
    <span v-if="label || description" class="min-w-0">
      <span class="block text-sm font-medium text-fg">{{ label }}</span>
      <span v-if="description" class="mt-0.5 block text-[13px] text-muted">{{ description }}</span>
    </span>
    <SwitchRoot
      :id="id"
      v-model="model"
      :disabled="disabled"
      class="relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-line-strong transition-colors data-[state=checked]:bg-primary"
    >
      <SwitchThumb
        class="block size-4 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[18px]"
      />
    </SwitchRoot>
  </label>
</template>
