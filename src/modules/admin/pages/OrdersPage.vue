<script setup lang="ts">
import { ShoppingBag } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract/admin-endpoints'
import { useApiList } from '@/shared/api/query'
import UiEmpty from '@/shared/ui/UiEmpty.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiLoadMore from '@/shared/ui/UiLoadMore.vue'
import UiMoney from '@/shared/ui/UiMoney.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSegmented from '@/shared/ui/UiSegmented.vue'
import UiStatus from '@/shared/ui/UiStatus.vue'
import UiTable from '@/shared/ui/UiTable.vue'
import UiTime from '@/shared/ui/UiTime.vue'
import SearchInput from '../components/SearchInput.vue'
import { useQueryParam } from '../components/useQueryParam'

const { t } = useI18n()
const q = useQueryParam('q', '')
const status = useQueryParam<'all' | 'pending_payment' | 'paid' | 'active' | 'cancelled' | 'fraud'>(
  'status',
  'all',
)
const list = useApiList(api.admin.orders, () => ({
  query: {
    limit: 30,
    ...(q.value ? { q: q.value } : {}),
    ...(status.value === 'all' ? {} : { status: status.value }),
  },
}))
const columns = computed(() => [
  { key: 'number', label: t('order.number') },
  { key: 'client', label: t('admin.client.client'), hideBelow: 'md' as const },
  { key: 'items', label: t('order.items'), align: 'right' as const, hideBelow: 'lg' as const },
  { key: 'status', label: t('common.status') },
  { key: 'total', label: t('invoice.total'), align: 'right' as const },
  { key: 'created', label: t('common.created'), align: 'right' as const, hideBelow: 'sm' as const },
])
</script>

<template>
  <div>
    <UiPageHeader :title="$t('admin.nav.orders')" :description="$t('admin.order.subtitle')" />
    <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <UiSegmented
        v-model="status"
        :options="
          (['all', 'pending_payment', 'paid', 'active', 'cancelled'] as const).map((v) => ({
            value: v,
            label: v === 'all' ? $t('common.all') : $t(`status.order.${v}`),
          }))
        "
      />
      <SearchInput v-model="q" :placeholder="$t('admin.order.search')" />
    </div>
    <div class="rounded-lg border border-line bg-surface shadow-xs">
      <UiErrorState v-if="list.isError.value" :error="list.error.value" @retry="list.refetch()" />
      <UiTable
        v-else
        :columns="columns"
        :rows="list.items.value"
        :row-key="(r) => r.id"
        :to="(r) => ({ name: 'admin-order', params: { id: r.id } })"
        :loading="list.isPending.value"
      >
        <template #cell-number="{ row }"
          ><RouterLink
            :to="{ name: 'admin-order', params: { id: row.id } }"
            class="font-mono text-[13px] font-medium"
            >#{{ row.number }}</RouterLink
          ></template
        >
        <template #cell-client="{ row }"
          ><RouterLink
            :to="{ name: 'admin-client', params: { id: row.client_id } }"
            class="text-fg-2 hover:text-primary"
            >{{ row.client_email }}</RouterLink
          ></template
        >
        <template #cell-items="{ row }"
          ><span class="num">{{ row.items }}</span></template
        >
        <template #cell-status="{ row }"><UiStatus kind="order" :value="row.status" /></template>
        <template #cell-total="{ row }"><UiMoney :value="row.total" class="font-medium" /></template>
        <template #cell-created="{ row }"><UiTime :value="row.created_at" mode="relative" /></template>
        <template #empty><UiEmpty :icon="ShoppingBag" :title="$t('order.empty')" /></template>
      </UiTable>
      <UiLoadMore
        :has-more="!!list.hasNextPage.value"
        :loading="list.isFetchingNextPage.value"
        @more="list.fetchNextPage()"
      />
    </div>
  </div>
</template>
