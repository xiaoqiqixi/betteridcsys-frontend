<script setup lang="ts">
import { Check } from '@lucide/vue'
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'

const model = defineModel<boolean>({ default: false })
defineProps<{ disabled?: boolean; label?: string }>()
</script>

<template>
  <label class="inline-flex cursor-pointer items-center gap-2.5 text-sm text-fg-2 select-none">
    <CheckboxRoot
      v-model="model"
      :disabled="disabled"
      class="grid size-4 shrink-0 place-items-center rounded-[5px] border border-line-strong bg-surface transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary"
    >
      <CheckboxIndicator><Check class="size-3 text-white" :stroke-width="3" /></CheckboxIndicator>
    </CheckboxRoot>
    <span v-if="label || $slots.default"
      ><slot>{{ label }}</slot></span
    >
  </label>
</template>
