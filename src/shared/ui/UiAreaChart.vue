<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * Lightweight SVG area chart: no charting library, crisp at any DPI, follows theme tokens.
 */
const props = withDefaults(
  defineProps<{
    values: (number | null)[]
    labels?: string[]
    height?: number
    format?: (v: number) => string
    color?: string
    showAxis?: boolean
  }>(),
  { height: 160, color: 'var(--primary)', showAxis: true },
)

const W = 600
const hover = ref<number | null>(null)
const max = computed(() => Math.max(1, ...props.values.map((v) => v ?? 0)) * 1.12)
const step = computed(() => (props.values.length > 1 ? W / (props.values.length - 1) : W))
const pts = computed(() =>
  props.values.map((v, i) => ({
    x: i * step.value,
    y: v == null ? null : props.height - (v / max.value) * (props.height - 8) - 4,
  })),
)
const line = computed(() => {
  let d = ''
  let pen = false
  for (const p of pts.value) {
    if (p.y == null) {
      pen = false
      continue
    }
    d += `${pen ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`
    pen = true
  }
  return d
})
const area = computed(() => {
  const valid = pts.value.filter((p) => p.y != null)
  if (valid.length < 2) return ''
  return `${line.value}L${valid.at(-1)!.x},${props.height}L${valid[0]!.x},${props.height}Z`
})
const gid = `g${Math.random().toString(36).slice(2, 8)}`

function onMove(e: PointerEvent) {
  const el = e.currentTarget as SVGElement
  const r = el.getBoundingClientRect()
  const i = Math.round(((e.clientX - r.left) / r.width) * (props.values.length - 1))
  hover.value = Math.max(0, Math.min(props.values.length - 1, i))
}
</script>

<template>
  <div class="relative w-full select-none">
    <svg
      :viewBox="`0 0 ${W} ${height}`"
      preserveAspectRatio="none"
      class="block w-full overflow-visible"
      :style="{ height: height + 'px' }"
      @pointermove="onMove"
      @pointerleave="hover = null"
    >
      <defs>
        <linearGradient :id="gid" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.22" />
          <stop offset="100%" :stop-color="color" stop-opacity="0" />
        </linearGradient>
      </defs>
      <g v-if="showAxis">
        <line
          v-for="i in 3"
          :key="i"
          x1="0"
          :x2="W"
          :y1="(height / 4) * i"
          :y2="(height / 4) * i"
          stroke="var(--line)"
          stroke-dasharray="3 4"
          vector-effect="non-scaling-stroke"
        />
      </g>
      <path :d="area" :fill="`url(#${gid})`" />
      <path
        :d="line"
        fill="none"
        :stroke="color"
        stroke-width="1.75"
        vector-effect="non-scaling-stroke"
        stroke-linejoin="round"
      />
      <line
        v-if="hover != null"
        :x1="pts[hover]!.x"
        :x2="pts[hover]!.x"
        y1="0"
        :y2="height"
        stroke="var(--line-strong)"
        vector-effect="non-scaling-stroke"
      />
    </svg>
    <div
      v-if="hover != null && values[hover] != null"
      class="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-md border border-line bg-elevated px-2 py-1 text-xs whitespace-nowrap shadow-md"
      :style="{ left: `${(hover / Math.max(1, values.length - 1)) * 100}%` }"
    >
      <div class="num font-medium text-fg">{{ format ? format(values[hover]!) : values[hover] }}</div>
      <div v-if="labels?.[hover]" class="text-faint">{{ labels[hover] }}</div>
    </div>
  </div>
</template>
