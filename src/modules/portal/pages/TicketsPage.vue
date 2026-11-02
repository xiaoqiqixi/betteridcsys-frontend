<script setup lang="ts">
import { LifeBuoy, Plus } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract/client-endpoints'
import type { TicketStatus } from '@/contract/support'
import { useApiList, useApiQuery } from '@/shared/api/query'
import { useFormat } from '@/shared/composables/format'
import UiButton from '@/shared/ui/UiButton.vue'
import UiEmpty from '@/shared/ui/UiEmpty.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiLoadMore from '@/shared/ui/UiLoadMore.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSegmented from '@/shared/ui/UiSegmented.vue'
import UiStatus from '@/shared/ui/UiStatus.vue'
import UiTable from '@/shared/ui/UiTable.vue'
import UiTime from '@/shared/ui/UiTime.vue'

const { t } = useI18n()
const f = useFormat()
const status = ref<'all' | TicketStatus>('all')
const list = useApiList(api.support.tickets, () => ({
  query: { limit: 25, ...(status.value === 'all' ? {} : { status: status.value }) },
}))
const departments = useApiQuery(api.support.departments, {}, { staleTime: 5 * 60_000 })
const dept = (id: string) => f.text(departments.data.value?.find((d) => d.id === id)?.name)
const filters = computed(() =>
  (['all', 'open', 'answered', 'customer_reply', 'closed'] as const).map((v) => ({
    value: v,
    label: v === 'all' ? t('common.all') : t(`status.ticket.${v}`),
  })),
)
const columns = computed(() => [
  { key: 'subject', label: t('ticket.subject') },
  { key: 'dept', label: t('ticket.department'), hideBelow: 'md' as const },
  { key: 'status', label: t('common.status') },
  { key: 'updated', label: t('ticket.lastReply'), align: 'right' as const, hideBelow: 'sm' as const },
])
</script>

<template>
  <div>
    <UiPageHeader :title="$t('nav.tickets')" :description="$t('ticket.subtitle')">
      <template #actions
        ><UiButton to="/tickets/new" variant="primary"
          ><Plus class="size-4" />{{ $t('ticket.new') }}</UiButton
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
        :to="(r) => ({ name: 'ticket', params: { id: r.id } })"
        :loading="list.isPending.value"
      >
        <template #cell-subject="{ row }">
          <p class="font-medium text-fg">{{ row.subject }}</p>
          <p class="font-mono text-xs text-muted">#{{ row.number }}</p>
        </template>
        <template #cell-dept="{ row }"
          ><span class="text-muted">{{ dept(row.department_id) }}</span></template
        >
        <template #cell-status="{ row }"><UiStatus kind="ticket" :value="row.status" /></template>
        <template #cell-updated="{ row }"><UiTime :value="row.last_reply_at" mode="relative" /></template>
        <template #empty>
          <UiEmpty :icon="LifeBuoy" :title="$t('ticket.empty')" :description="$t('ticket.emptyBody')">
            <UiButton to="/tickets/new" variant="primary" size="sm">{{ $t('ticket.new') }}</UiButton>
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
