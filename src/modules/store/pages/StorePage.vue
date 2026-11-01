<script setup lang="ts">
import { PackageSearch } from '@lucide/vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { BillingCycle } from '@/contract'
import { useFormat } from '@/shared/composables/format'
import UiEmpty from '@/shared/ui/UiEmpty.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiSegmented from '@/shared/ui/UiSegmented.vue'
import UiSelect from '@/shared/ui/UiSelect.vue'
import PlanCard from '../components/PlanCard.vue'
import PlanCardSkeleton from '../components/PlanCardSkeleton.vue'
import { useCatalog } from '../components/useCatalog'
import { flag, startingPrice } from '../lib/pricing'

const route = useRoute()
const router = useRouter()
const f = useFormat()

// Filters live in the URL so results are shareable and survive reloads.
function q(name: string) {
  return computed({
    get: () => (typeof route.query[name] === 'string' ? (route.query[name] as string) : ''),
    set: (v: string) => router.replace({ query: { ...route.query, [name]: v || undefined } }),
  })
}
const type = q('type')
const region = q('region')
const cycle = computed({
  get: () => ((route.query.cycle as BillingCycle) || 'monthly') as BillingCycle,
  set: (v: BillingCycle) =>
    router.replace({ query: { ...route.query, cycle: v === 'monthly' ? undefined : v } }),
})
const sort = q('sort')

const { site, products, regionOf, nodeOf, typeOf, visibleTypes, visibleRegions } = useCatalog()

const typeTabs = computed(() => [
  { value: '', label: f.text({ 'zh-CN': '全部', en: 'All' }) },
  ...visibleTypes.value.map((t) => ({ value: t.slug, label: f.text(t.name) })),
])
const activeType = computed(() => visibleTypes.value.find((t) => t.slug === type.value))
const regionChoices = computed(() =>
  visibleRegions.value.filter((r) => !activeType.value || r.type_id === activeType.value.id),
)
const cycles = computed(() => {
  const present = new Set(
    (products.data.value ?? []).flatMap((p) =>
      p.prices.filter((x) => x.currency === site.currency.value).map((x) => x.cycle),
    ),
  )
  return (['monthly', 'quarterly', 'annually'] as BillingCycle[])
    .filter((c) => present.has(c))
    .map((c) => ({ value: c, label: f.cycle(c) }))
})
const list = computed(() => {
  let items = (products.data.value ?? []).filter(
    (p) =>
      (!activeType.value || p.type_id === activeType.value.id) &&
      (!region.value || p.region_id === region.value),
  )
  const price = (id: string) => {
    const p = items.find((x) => x.id === id)!
    return (
      p.prices.find((x) => x.currency === site.currency.value && x.cycle === cycle.value)?.recurring_minor ??
      startingPrice(p, site.currency.value)?.recurring_minor ??
      Infinity
    )
  }
  items = [...items]
  if (sort.value === 'price_asc') items.sort((a, b) => price(a.id) - price(b.id))
  else if (sort.value === 'price_desc') items.sort((a, b) => price(b.id) - price(a.id))
  else items.sort((a, b) => a.sort_order - b.sort_order)
  return items
})
const sortOptions = computed(() => [
  { value: '', label: f.text({ 'zh-CN': '推荐排序', en: 'Recommended' }) },
  { value: 'price_asc', label: f.text({ 'zh-CN': '价格从低到高', en: 'Price: low to high' }) },
  { value: 'price_desc', label: f.text({ 'zh-CN': '价格从高到低', en: 'Price: high to low' }) },
])
</script>

<template>
  <div>
    <section class="relative overflow-hidden border-b border-line">
      <div class="glow pointer-events-none absolute inset-0 opacity-70" />
      <div class="bg-grid mask-fade-b pointer-events-none absolute inset-0" />
      <div class="relative mx-auto max-w-[1200px] px-5 pt-14 pb-10">
        <h1 class="text-[32px] font-semibold tracking-tight sm:text-[40px]">
          {{ activeType ? f.text(activeType.name) : $t('store.title') }}
        </h1>
        <p class="mt-3 max-w-xl text-[15px] text-muted">
          {{ activeType?.description ? f.text(activeType.description) : $t('store.subtitle') }}
        </p>
        <div class="mt-8"><UiSegmented v-model="type" :options="typeTabs" /></div>
      </div>
    </section>

    <section class="mx-auto max-w-[1200px] px-5 py-8">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-wrap gap-2" role="group" :aria-label="$t('store.region')">
          <button
            v-for="r in [
              { id: '', label: $t('store.allRegions') },
              ...regionChoices.map((x) => ({ id: x.id, label: `${flag(x.country)} ${f.text(x.name)}` })),
            ]"
            :key="r.id"
            type="button"
            :aria-pressed="region === r.id"
            :class="[
              'h-8 rounded-full border px-3.5 text-[13px] transition-colors',
              region === r.id
                ? 'border-primary bg-primary-soft font-medium text-primary'
                : 'border-line bg-surface text-fg-2 hover:border-line-strong',
            ]"
            @click="region = r.id"
          >
            {{ r.label }}
          </button>
        </div>
        <div class="flex items-center gap-2">
          <UiSegmented v-if="cycles.length > 1" v-model="cycle" :options="cycles" size="sm" />
          <div class="w-44">
            <UiSelect
              :aria-label="$t('admin.product.sortOrder')"
              v-model="sort"
              :options="sortOptions"
              size="sm"
            />
          </div>
        </div>
      </div>

      <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <template v-if="products.isPending.value"><PlanCardSkeleton v-for="i in 6" :key="i" /></template>
        <UiErrorState
          v-else-if="products.isError.value"
          class="sm:col-span-2 lg:col-span-3"
          :error="products.error.value"
          @retry="products.refetch()"
        />
        <UiEmpty
          v-else-if="!list.length"
          class="rounded-xl border border-dashed border-line sm:col-span-2 lg:col-span-3"
          :icon="PackageSearch"
          :title="$t('store.emptyTitle')"
          :description="$t('store.emptyBody')"
        />
        <template v-else>
          <PlanCard
            v-for="p in list"
            :key="p.id"
            :product="p"
            :currency="site.currency.value"
            :cycle="cycle"
            :region="regionOf(p)"
            :node="nodeOf(p)"
            :data-type="typeOf(p)?.slug"
          />
        </template>
      </div>
    </section>
  </div>
</template>
