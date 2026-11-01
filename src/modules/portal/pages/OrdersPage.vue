<script setup lang="ts">
import { ShoppingBag } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract'
import { useApiList } from '@/shared/api/query'
import UiEmpty from '@/shared/ui/UiEmpty.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiLoadMore from '@/shared/ui/UiLoadMore.vue'
import UiMoney from '@/shared/ui/UiMoney.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiStatus from '@/shared/ui/UiStatus.vue'
import UiTable from '@/shared/ui/UiTable.vue'
import UiTime from '@/shared/ui/UiTime.vue'

const { t } = useI18n()
const list = useApiList(api.orders.list, { query: { limit: 25 } })
const columns = computed(() => [
  { key: 'number', label: t('order.number') },
  { key: 'items', label: t('order.items'), hideBelow: 'md' as const },
  { key: 'created', label: t('common.created'), hideBelow: 'sm' as const },
  { key: 'status', label: t('common.status') },
  { key: 'total', label: t('invoice.total'), align: 'right' as const },
])
</script>

<template>
  <div>
    <UiPageHeader :title="$t('nav.orders')" :description="$t('order.subtitle')" />
    <div class="rounded-lg border border-line bg-surface shadow-xs">
      <UiErrorState v-if="list.isError.value" :error="list.error.value" @retry="list.refetch()" />
      <UiTable
        v-else
        :columns="columns"
        :rows="list.items.value"
        :row-key="(r) => r.id"
        :to="(r) => ({ name: 'order', params: { id: r.id } })"
        :loading="list.isPending.value"
      >
        <template #cell-number="{ row }"
          ><span class="font-mono text-[13px] font-medium">#{{ row.number }}</span></template
        >
        <template #cell-items="{ row }"
          ><span class="line-clamp-1 text-muted">{{
            row.items.map((i) => i.product_name).join(', ')
          }}</span></template
        >
        <template #cell-created="{ row }"><UiTime :value="row.created_at" /></template>
        <template #cell-status="{ row }"><UiStatus kind="order" :value="row.status" /></template>
        <template #cell-total="{ row }"><UiMoney :value="row.total" class="font-medium" /></template>
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
