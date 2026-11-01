<script setup lang="ts">
import { useId } from 'vue'

defineProps<{
  label?: string
  hint?: string
  error?: string | null
  required?: boolean
  optional?: boolean
}>()
const id = useId()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div v-if="label || $slots.aside" class="flex items-baseline justify-between gap-3">
      <label v-if="label" :for="id" class="text-[13px] font-medium text-fg-2">
        {{ label }}<span v-if="required" class="ml-0.5 text-danger">*</span>
        <span v-if="optional" class="ml-1 font-normal text-faint">({{ $t('common.optional') }})</span>
      </label>
      <slot name="aside" />
    </div>
    <slot :id="id" :invalid="!!error" />
    <p v-if="error" class="text-xs text-danger" role="alert">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-muted">{{ hint }}</p>
  </div>
</template>
