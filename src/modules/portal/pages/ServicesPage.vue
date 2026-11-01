<script setup lang="ts">
import { Plus, Server } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract'
import type { ServiceStatus } from '@/contract/commerce'
import { useApiList } from '@/shared/api/query'
import UiButton from '@/shared/ui/UiButton.vue'
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

const { t } = useI18n()
const status = ref<'all' | ServiceStatus>('all')
const list = useApiList(api.services.list, () => ({
  query: { limit: 25, ...(status.value === 'all' ? {} : { status: status.value }) },
}))
const filters = computed(() =>
  (['all', 'active', 'provisioning', 'suspended', 'terminated'] as const).map((v) => ({
    value: v,
    label: v === 'all' ? t('common.all') : t(`status.service.${v}`),
  })),
)
const columns = computed(() => [
  { key: 'name', label: t('portal.col.service') },
  { key: 'ip', label: t('portal.col.ip'), hideBelow: 'md' as const },
  { key: 'status', label: t('common.status') },
  { key: 'price', label: t('portal.col.price'), align: 'right' as const, hideBelow: 'sm' as const },
  { key: 'due', label: t('portal.col.nextDue'), align: 'right' as const, hideBelow: 'lg' as const },
])
</script>

<template>
  <div>
    <UiPageHeader :title="$t('nav.services')" :description="$t('portal.servicesSubtitle')">
      <template #actions
        ><UiButton to="/store" variant="primary"
          ><Plus class="size-4" />{{ $t('nav.newService') }}</UiButton
        ></template
      >
    </UiPageHeader>
    <div class="mb-4"><UiSegmented v-model="status" :options="filters" /></div>
    <div class="rounded-lg border border-line bg-surface shadow-xs">
      <UiErrorState v-if="list.isError.value" :error="list.error.value" @retry="list.refetch()" />
      <UiTable
        v-else
        :columns="columns"
        :rows="list.items.value"
        :row-key="(r) => r.id"
        :to="(r) => ({ name: 'service', params: { id: r.id } })"
        :loading="list.isPending.value"
      >
        <template #cell-name="{ row }">
          <div class="flex items-center gap-3">
            <span
              class="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-surface-2 text-muted"
              ><Server class="size-4"
            /></span>
            <div class="min-w-0">
              <p class="truncate font-medium text-fg">{{ row.label || row.hostname || row.product_name }}</p>
              <p class="truncate text-xs text-muted">{{ row.product_name }} · {{ row.region }}</p>
            </div>
          </div>
        </template>
        <template #cell-ip="{ row }"
          ><UiCopy v-if="row.primary_ipv4" :text="row.primary_ipv4" mono /><span v-else class="text-faint"
            >—</span
          ></template
        >
        <template #cell-status="{ row }">
          <div class="flex flex-wrap items-center gap-1.5">
            <UiStatus kind="service" :value="row.status" />
            <UiStatus v-if="row.status === 'active' && row.power" kind="power" :value="row.power" />
          </div>
        </template>
        <template #cell-price="{ row }"
          ><UiMoney :value="row.recurring" /><span class="text-xs text-muted">
            / {{ $t(`cyclePer.${row.cycle}`) }}</span
          ></template
        >
        <template #cell-due="{ row }"><UiTime :value="row.next_due_at" /></template>
        <template #empty>
          <UiEmpty :icon="Server" :title="$t('portal.noServices')" :description="$t('portal.noServicesBody')">
            <UiButton to="/store" variant="primary" size="sm">{{ $t('home.ctaPrimary') }}</UiButton>
          </UiEmpty>
        </template>
      </UiTable>
      <UiLoadMore
        :has-more="!!list.hasNextPage.value"
        :loading="list.isFetchingNextPage.value"
        @more="list.fetchNextPage()"
      />
    </div>
  </div>
</template>
