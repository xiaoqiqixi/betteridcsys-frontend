<script setup lang="ts">
import { Copy, Package, Plus } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { api } from '@/contract'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import { useSite } from '@/shared/composables/site'
import { useToast } from '@/shared/composables/toast'
import { useSession } from '@/shared/stores/session'
import UiBadge from '@/shared/ui/UiBadge.vue'
import UiButton from '@/shared/ui/UiButton.vue'
import UiEmpty from '@/shared/ui/UiEmpty.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSegmented from '@/shared/ui/UiSegmented.vue'
import UiTable from '@/shared/ui/UiTable.vue'
import SearchInput from '../components/SearchInput.vue'
import { useQueryParam } from '../components/useQueryParam'
import { asMoney, startingPrice } from '@/modules/store/lib/pricing'

const { t } = useI18n()
const router = useRouter()
const f = useFormat()
const site = useSite()
const toast = useToast()
const errors = useErrorText()
const session = useSession()
const products = useApiQuery(api.admin.products)
const taxonomy = useApiQuery(api.admin.taxonomy)
const q = useQueryParam('q', '')
const vis = useQueryParam<'all' | 'public' | 'hidden' | 'retired'>('visibility', 'all')
const nodeName = (id: string) => {
  const tx = taxonomy.data.value
  const n = tx?.nodes.find((x) => x.id === id)
  const r = tx?.regions.find((x) => x.id === n?.region_id)
  return [f.text(r?.name), n?.network_label || f.text(n?.name)].filter(Boolean).join(' · ')
}
const rows = computed(() =>
  (products.data.value ?? [])
    .filter((p) => vis.value === 'all' || p.visibility === vis.value)
    .filter(
      (p) =>
        !q.value || [f.text(p.name), p.slug].some((x) => x.toLowerCase().includes(q.value.toLowerCase())),
    )
    .sort((a, b) => a.sort_order - b.sort_order),
)
const duplicate = useApiMutation(api.admin.duplicateProduct, {
  invalidates: [api.admin.products],
  onSuccess: (p) => router.push({ name: 'admin-product', params: { id: p.id } }),
})
const columns = computed(() => [
  { key: 'name', label: t('admin.product.name') },
  { key: 'node', label: t('admin.product.location'), hideBelow: 'lg' as const },
  { key: 'specs', label: t('admin.product.specs'), hideBelow: 'md' as const },
  { key: 'price', label: t('portal.col.price'), align: 'right' as const, hideBelow: 'sm' as const },
  { key: 'stock', label: t('admin.product.stock'), align: 'right' as const, hideBelow: 'lg' as const },
  { key: 'actions', label: '', align: 'right' as const },
])
</script>

<template>
  <div>
    <UiPageHeader :title="$t('admin.nav.products')" :description="$t('admin.product.subtitle')">
      <template #actions
        ><UiButton v-if="session.can('products.write')" to="/admin/products/new" variant="primary"
          ><Plus class="size-4" />{{ $t('admin.product.create') }}</UiButton
        ></template
      >
    </UiPageHeader>
    <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <UiSegmented
        v-model="vis"
        :options="
          (['all', 'public', 'hidden', 'retired'] as const).map((v) => ({
            value: v,
            label: v === 'all' ? $t('common.all') : $t(`admin.product.visibility.${v}`),
          }))
        "
      />
      <SearchInput v-model="q" />
    </div>
    <div class="rounded-lg border border-line bg-surface shadow-xs">
      <UiErrorState v-if="products.isError.value" :error="products.error.value" @retry="products.refetch()" />
      <UiTable
        v-else
        :columns="columns"
        :rows="rows"
        :row-key="(r) => r.id"
        :to="(r) => ({ name: 'admin-product', params: { id: r.id } })"
        :loading="products.isPending.value"
      >
        <template #cell-name="{ row }">
          <p class="flex items-center gap-2 font-medium">
            {{ f.text(row.name) }}
            <UiBadge
              v-if="row.visibility !== 'public'"
              :tone="row.visibility === 'hidden' ? 'warning' : 'neutral'"
              >{{ $t(`admin.product.visibility.${row.visibility}`) }}</UiBadge
            >
          </p>
          <p class="font-mono text-xs text-muted">
            {{ row.slug }} · {{ $t('admin.product.activeServices', { n: row.active_services }) }}
          </p>
        </template>
        <template #cell-node="{ row }"
          ><span class="text-muted">{{ nodeName(row.node_id) }}</span></template
        >
        <template #cell-specs="{ row }"
          ><span class="text-[13px] text-muted"
            >{{ row.specs.cpu_cores }}C · {{ f.memory(row.specs.memory_mb) }} · {{ row.specs.disk_gb }}G ·
            {{ f.bandwidth(row.specs.bandwidth_mbps) }}</span
          ></template
        >
        <template #cell-price="{ row }">
          <span v-if="startingPrice(row, site.currency.value)" class="num"
            >{{ f.money(asMoney(startingPrice(row, site.currency.value)!))
            }}<span class="text-xs text-muted">
              / {{ f.per(startingPrice(row, site.currency.value)!.cycle) }}</span
            ></span
          >
          <span v-else class="text-xs text-warning">{{
            $t('admin.product.noPrice', { c: site.currency.value })
          }}</span>
        </template>
        <template #cell-stock="{ row }"
          ><span class="num">{{ row.stock === null ? '∞' : row.stock }}</span></template
        >
        <template #cell-actions="{ row }">
          <UiButton
            v-if="session.can('products.write')"
            size="sm"
            variant="ghost"
            square
            :aria-label="$t('admin.product.duplicate')"
            :loading="duplicate.isPending.value && duplicate.variables.value?.params.id === row.id"
            @click="
              duplicate.mutate(
                { params: { id: row.id }, body: {} },
                { onError: (e) => toast.error(errors.text(e)) },
              )
            "
          >
            <Copy class="size-3.5" />
          </UiButton>
        </template>
        <template #empty><UiEmpty :icon="Package" :title="$t('admin.product.empty')" /></template>
      </UiTable>
    </div>
  </div>
</template>
