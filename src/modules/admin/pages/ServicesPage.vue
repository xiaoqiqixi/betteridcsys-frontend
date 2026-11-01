<script setup lang="ts">
import { Server } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract'
import type { ServiceStatus } from '@/contract/commerce'
import { useApiList } from '@/shared/api/query'
import UiCopy from '@/shared/ui/UiCopy.vue'
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
const status = useQueryParam<'all' | ServiceStatus>('status', 'all')
const list = useApiList(api.admin.services, () => ({
  query: {
    limit: 30,
    ...(q.value ? { q: q.value } : {}),
    ...(status.value === 'all' ? {} : { status: status.value }),
  },
}))
const columns = computed(() => [
  { key: 'name', label: t('portal.col.service') },
  { key: 'client', label: t('admin.client.client'), hideBelow: 'lg' as const },
  { key: 'ip', label: t('portal.col.ip'), hideBelow: 'md' as const },
  { key: 'status', label: t('common.status') },
  { key: 'price', label: t('portal.col.price'), align: 'right' as const, hideBelow: 'sm' as const },
  { key: 'due', label: t('portal.col.nextDue'), align: 'right' as const, hideBelow: 'lg' as const },
])
</script>

<template>
  <div>
    <UiPageHeader :title="$t('admin.nav.services')" :description="$t('admin.service.subtitle')" />
    <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <UiSegmented
        v-model="status"
        :options="
          (['all', 'active', 'provisioning', 'suspended', 'failed', 'terminated'] as const).map((v) => ({
            value: v,
            label: v === 'all' ? $t('common.all') : $t(`status.service.${v}`),
          }))
        "
      />
      <SearchInput v-model="q" :placeholder="$t('admin.service.search')" />
    </div>
    <div class="rounded-lg border border-line bg-surface shadow-xs">
      <UiErrorState v-if="list.isError.value" :error="list.error.value" @retry="list.refetch()" />
      <UiTable
        v-else
        :columns="columns"
        :rows="list.items.value"
        :row-key="(r) => r.id"
        :to="(r) => ({ name: 'admin-service', params: { id: r.id } })"
        :loading="list.isPending.value"
      >
        <template #cell-name="{ row }"
          ><p class="font-medium">{{ row.label || row.hostname || row.product_name }}</p>
          <p class="text-xs text-muted">{{ row.product_name }} · {{ row.region }}</p></template
        >
        <template #cell-client="{ row }"
          ><RouterLink
            :to="{ name: 'admin-client', params: { id: row.client_id } }"
            class="text-fg-2 hover:text-primary"
            >{{ row.client_email }}</RouterLink
          ></template
        >
        <template #cell-ip="{ row }"
          ><UiCopy v-if="row.primary_ipv4" :text="row.primary_ipv4" mono /><span v-else class="text-faint"
            >—</span
          ></template
        >
        <template #cell-status="{ row }"
          ><div class="flex flex-wrap gap-1.5">
            <UiStatus kind="service" :value="row.status" /><UiStatus
              v-if="row.status === 'active' && row.power"
              kind="power"
              :value="row.power"
            /></div
        ></template>
        <template #cell-price="{ row }"><UiMoney :value="row.recurring" /></template>
        <template #cell-due="{ row }"><UiTime :value="row.next_due_at" /></template>
        <template #empty><UiEmpty :icon="Server" :title="$t('portal.noServices')" /></template>
      </UiTable>
      <UiLoadMore
        :has-more="!!list.hasNextPage.value"
        :loading="list.isFetchingNextPage.value"
        @more="list.fetchNextPage()"
      />
    </div>
  </div>
</template>
