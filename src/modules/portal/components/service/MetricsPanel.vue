<script setup lang="ts">
import { computed, ref } from 'vue'
import { api } from '@/contract'
import type { Service } from '@/contract/commerce'
import { useApiQuery } from '@/shared/api/query'
import { useFormat } from '@/shared/composables/format'
import UiAreaChart from '@/shared/ui/UiAreaChart.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiSegmented from '@/shared/ui/UiSegmented.vue'

const props = defineProps<{ service: Service }>()
const f = useFormat()
const range = ref<'1h' | '24h' | '7d' | '30d'>('24h')
const metrics = useApiQuery(
  api.services.metrics,
  () => ({ params: { id: props.service.id }, query: { range: range.value } }),
  {
    refetchInterval: () => (range.value === '1h' ? 30_000 : false),
    keepPrevious: true,
  },
)
const pts = computed(() => metrics.data.value?.points ?? [])
const labels = computed(() =>
  pts.value.map((p) => f.date(p.at, range.value === '7d' || range.value === '30d' ? 'short' : 'datetime')),
)
const charts = computed(() => [
  {
    key: 'cpu',
    values: pts.value.map((p) => p.cpu_percent),
    fmt: (v: number) => `${v.toFixed(1)}%`,
    color: 'var(--primary)',
  },
  {
    key: 'netIn',
    values: pts.value.map((p) => p.net_in_bps),
    fmt: (v: number) => f.bytes(v, true),
    color: '#22c55e',
  },
  {
    key: 'netOut',
    values: pts.value.map((p) => p.net_out_bps),
    fmt: (v: number) => f.bytes(v, true),
    color: '#a855f7',
  },
  {
    key: 'diskRead',
    values: pts.value.map((p) => p.disk_read_bps),
    fmt: (v: number) => f.bytes(v) + '/s',
    color: '#f59e0b',
  },
])
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex justify-end">
      <UiSegmented
        v-model="range"
        size="sm"
        :options="[
          { value: '1h', label: '1h' },
          { value: '24h', label: '24h' },
          { value: '7d', label: '7d' },
          { value: '30d', label: '30d' },
        ]"
      />
    </div>
    <UiErrorState v-if="metrics.isError.value" :error="metrics.error.value" @retry="metrics.refetch()" />
    <div v-else class="grid gap-4 lg:grid-cols-2">
      <div v-for="c in charts" :key="c.key" class="rounded-lg border border-line bg-surface p-4 shadow-xs">
        <p class="mb-3 text-[13px] font-medium text-fg-2">{{ $t(`service.metric.${c.key}`) }}</p>
        <div v-if="metrics.isPending.value" class="skeleton h-[140px] rounded-md" />
        <p
          v-else-if="!c.values.some((v) => v != null)"
          class="grid h-[140px] place-items-center text-[13px] text-muted"
        >
          {{ $t('service.noData') }}
        </p>
        <UiAreaChart
          v-else
          :values="c.values"
          :labels="labels"
          :height="140"
          :format="c.fmt"
          :color="c.color"
        />
      </div>
    </div>
  </div>
</template>
