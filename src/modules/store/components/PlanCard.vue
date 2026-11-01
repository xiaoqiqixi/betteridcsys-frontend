<script setup lang="ts">
import { ArrowRight, Cpu, Gauge, HardDrive, MemoryStick, Network } from '@lucide/vue'
import { computed } from 'vue'
import type { BillingCycle } from '@/contract'
import type { CatalogNode, CatalogRegion } from '@/contract/site'
import type { Product } from '@/contract/commerce'
import { useFormat } from '@/shared/composables/format'
import UiBadge from '@/shared/ui/UiBadge.vue'
import UiButton from '@/shared/ui/UiButton.vue'
import { asMoney, flag, pricesFor, savingPercent } from '../lib/pricing'

const props = defineProps<{
  product: Product
  currency: string
  cycle?: BillingCycle
  region?: CatalogRegion
  node?: CatalogNode
}>()
const f = useFormat()

const point = computed(() => {
  const all = pricesFor(props.product, props.currency)
  return all.find((p) => p.cycle === props.cycle) ?? all[0] ?? null
})
const saving = computed(() =>
  point.value ? savingPercent(props.product, props.currency, point.value.cycle) : null,
)
const soldOut = computed(() => !props.product.available || props.product.stock === 0)
const specs = computed(() => [
  { icon: Cpu, label: f.number(props.product.specs.cpu_cores) + ' vCPU' },
  { icon: MemoryStick, label: f.memory(props.product.specs.memory_mb) },
  { icon: HardDrive, label: `${props.product.specs.disk_gb} GB NVMe` },
  { icon: Gauge, label: f.bandwidth(props.product.specs.bandwidth_mbps) },
  {
    icon: Network,
    label:
      f.traffic(props.product.specs.traffic_gb) +
      (props.product.specs.traffic_gb === null ? '' : ' / ' + f.per('monthly')),
  },
])
</script>

<template>
  <article
    :class="[
      'group relative flex flex-col rounded-xl border bg-surface p-5 shadow-xs transition-[border-color,box-shadow,transform] duration-200',
      soldOut
        ? 'border-line opacity-75'
        : 'border-line hover:-translate-y-0.5 hover:border-primary-line hover:shadow-md',
    ]"
  >
    <header class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p v-if="region" class="mb-1.5 flex items-center gap-1.5 text-xs text-muted">
          <span aria-hidden="true">{{ flag(region.country) }}</span
          >{{ f.text(region.name) }}
          <template v-if="node"
            ><span class="text-faint">·</span>{{ node.network_label || f.text(node.name) }}</template
          >
        </p>
        <h3 class="truncate text-base font-semibold text-fg">{{ f.text(product.name) }}</h3>
      </div>
      <div class="flex shrink-0 gap-1">
        <UiBadge
          v-for="b in product.badges"
          :key="b"
          :tone="b === 'hot' ? 'danger' : b === 'new' ? 'primary' : b === 'limited' ? 'warning' : 'success'"
        >
          {{ $t(`store.badge.${b}`) }}
        </UiBadge>
      </div>
    </header>

    <ul class="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 text-[13px] text-fg-2">
      <li v-for="s in specs" :key="s.label" class="flex min-w-0 items-center gap-2">
        <component :is="s.icon" class="size-3.5 shrink-0 text-faint" />
        <span class="truncate">{{ s.label }}</span>
      </li>
      <li class="flex items-center gap-2">
        <span class="size-3.5 shrink-0 text-center text-[10px] leading-3.5 font-semibold text-faint">IP</span
        >{{ product.specs.ipv4 }} IPv4<span v-if="product.specs.ipv6" class="text-faint">+ IPv6</span>
      </li>
    </ul>

    <div class="mt-5 flex items-end justify-between gap-3 border-t border-line pt-4">
      <div v-if="point" class="min-w-0">
        <div class="flex items-baseline gap-1">
          <span class="num text-2xl font-semibold tracking-tight text-fg">{{ f.money(asMoney(point)) }}</span>
          <span class="text-[13px] text-muted">/ {{ f.per(point.cycle) }}</span>
        </div>
        <p class="mt-0.5 h-4 text-xs">
          <span v-if="saving" class="font-medium text-success">{{ $t('store.save', { pct: saving }) }}</span>
          <span
            v-else-if="product.stock !== null && product.stock > 0 && product.stock <= 5"
            class="text-warning"
            >{{ $t('store.lowStock', { n: product.stock }) }}</span
          >
        </p>
      </div>
      <p v-else class="text-[13px] text-muted">{{ $t('store.notInCurrency') }}</p>
      <UiButton v-if="soldOut" disabled size="sm">{{ $t('store.soldOut') }}</UiButton>
      <UiButton
        v-else-if="point"
        :to="{ name: 'configure', params: { id: product.id }, query: { cycle: point.cycle } }"
        variant="primary"
        size="sm"
      >
        {{ $t('store.configure')
        }}<ArrowRight class="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </UiButton>
    </div>
  </article>
</template>
