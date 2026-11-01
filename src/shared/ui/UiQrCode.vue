<script setup lang="ts">
import { computed } from 'vue'
import { encode } from 'uqr'

/** QR code rendered as one SVG path (no innerHTML, CSP-safe). Always dark-on-white for scanners. */
const props = withDefaults(defineProps<{ value: string; size?: number; label: string }>(), { size: 208 })
const qr = computed(() => encode(props.value, { ecc: 'M', border: 2 }))
const path = computed(() => {
  let d = ''
  qr.value.data.forEach((row, y) =>
    row.forEach((on, x) => {
      if (on) d += `M${x},${y}h1v1h-1z`
    }),
  )
  return d
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    :viewBox="`0 0 ${qr.size} ${qr.size}`"
    shape-rendering="crispEdges"
    role="img"
    :aria-label="label"
    class="rounded-lg bg-white"
  >
    <path :d="path" fill="#0b0e14" />
  </svg>
</template>
