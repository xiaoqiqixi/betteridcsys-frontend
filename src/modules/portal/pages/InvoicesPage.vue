<script setup lang="ts">
import { Receipt } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract'
import type { z } from 'zod'
import type { InvoiceStatus } from '@/contract/commerce'
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

const { t } = useI18n()
type Status = z.infer<typeof InvoiceStatus>
const status = ref<'all' | Status>('all')
const list = useApiList(api.billing.invoices, () => ({
  query: { limit: 25, ...(status.value === 'all' ? {} : { status: status.value }) },
}))
const filters = computed(() =>
  (['all', 'unpaid', 'paid', 'cancelled', 'refunded'] as const).map((v) => ({
    value: v,
    label: v === 'all' ? t('common.all') : t(`status.invoice.${v}`),
  })),
)
const columns = computed(() => [
  { key: 'number', label: t('invoice.number') },
  { key: 'kind', label: t('invoice.kindLabel'), hideBelow: 'md' as const },
  { key: 'issued', label: t('invoice.issued'), hideBelow: 'sm' as const },
  { key: 'due', label: t('invoice.due'), hideBelow: 'lg' as const },
  { key: 'status', label: t('common.status') },
  { key: 'total', label: t('invoice.total'), align: 'right' as const },
])
</script>

<template>
  <div>
    <UiPageHeader :title="$t('nav.invoices')" :description="$t('invoice.subtitle')" />
    <div class="mb-4"><UiSegmented v-model="status" :options="filters" /></div>
    <div class="rounded-lg border border-line bg-surface shadow-xs">
      <UiErrorState v-if="list.isError.value" :error="list.error.value" @retry="list.refetch()" />
      <UiTable
        v-else
        :columns="columns"
        :rows="list.items.value"
        :row-key="(r) => r.id"
        :to="(r) => ({ name: 'invoice', params: { id: r.id } })"
        :loading="list.isPending.value"
      >
        <template #cell-number="{ row }"
          ><span class="font-mono text-[13px] font-medium">#{{ row.number }}</span></template
        >
        <template #cell-kind="{ row }"
          ><span class="text-muted">{{ $t(`invoice.kind.${row.kind}`) }}</span></template
        >
        <template #cell-issued="{ row }"><UiTime :value="row.issued_at" /></template>
        <template #cell-due="{ row }"><UiTime :value="row.due_at" /></template>
        <template #cell-status="{ row }"><UiStatus kind="invoice" :value="row.status" /></template>
        <template #cell-total="{ row }"><UiMoney :value="row.total" class="font-medium" /></template>
        <template #empty><UiEmpty :icon="Receipt" :title="$t('invoice.empty')" /></template>
      </UiTable>
      <UiLoadMore
        :has-more="!!list.hasNextPage.value"
        :loading="list.isFetchingNextPage.value"
        @more="list.fetchNextPage()"
      />
    </div>
  </div>
</template>
