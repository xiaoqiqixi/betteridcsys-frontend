<script setup lang="ts">
import type { Money } from '@/contract'
import { useFormat } from '@/shared/composables/format'

defineProps<{ value: Money | null | undefined; signed?: boolean; compact?: boolean }>()
const f = useFormat()
</script>

<template>
  <span
    class="num whitespace-nowrap"
    :class="
      signed && value && value.amount_minor < 0
        ? 'text-danger'
        : signed && value && value.amount_minor > 0
          ? 'text-success'
          : ''
    "
  >
    {{ f.money(value, { signed, compact }) }}
  </span>
</template>
