<script setup lang="ts">
import { useFormat } from '@/shared/composables/format'
import UiTooltip from './UiTooltip.vue'

withDefaults(defineProps<{ value: string | null | undefined; mode?: 'date' | 'datetime' | 'relative' }>(), {
  mode: 'date',
})
const f = useFormat()
</script>

<template>
  <span v-if="!value" class="text-faint">—</span>
  <UiTooltip v-else :text="f.date(value, 'datetime')">
    <time :datetime="value" class="num whitespace-nowrap">{{
      mode === 'relative' ? f.relative(value) : f.date(value, mode)
    }}</time>
  </UiTooltip>
</template>
