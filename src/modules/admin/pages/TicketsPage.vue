<script setup lang="ts">
import { LifeBuoy } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract/admin-endpoints'
import type { TicketStatus } from '@/contract/support'
import { useApiList, useApiQuery } from '@/shared/api/query'
import { useFormat } from '@/shared/composables/format'
import UiBadge from '@/shared/ui/UiBadge.vue'
import UiEmpty from '@/shared/ui/UiEmpty.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiLoadMore from '@/shared/ui/UiLoadMore.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSegmented from '@/shared/ui/UiSegmented.vue'
import UiSelect from '@/shared/ui/UiSelect.vue'
import UiStatus from '@/shared/ui/UiStatus.vue'
import UiTable from '@/shared/ui/UiTable.vue'
import UiTime from '@/shared/ui/UiTime.vue'
import SearchInput from '../components/SearchInput.vue'
import { useQueryParam } from '../components/useQueryParam'

const { t } = useI18n()
const f = useFormat()
const q = useQueryParam('q', '')
const status = useQueryParam<'all' | TicketStatus>('status', 'all')
const dept = useQueryParam('department', '')
const departments = useApiQuery(api.admin.departments, {}, { staleTime: 5 * 60_000 })
const list = useApiList(api.admin.tickets, () => ({
  query: {
    limit: 30,
    ...(q.value ? { q: q.value } : {}),
    ...(status.value === 'all' ? {} : { status: status.value }),
    ...(dept.value ? { department_id: dept.value } : {}),
  },
}))
const deptName = (id: string) => f.text(departments.data.value?.find((d) => d.id === id)?.name)
const columns = computed(() => [
  { key: 'subject', label: t('ticket.subject') },
  { key: 'client', label: t('admin.client.client'), hideBelow: 'md' as const },
  { key: 'dept', label: t('ticket.department'), hideBelow: 'lg' as const },
  { key: 'assignee', label: t('admin.ticket.assignee'), hideBelow: 'lg' as const },
  { key: 'status', label: t('common.status') },
  { key: 'updated', label: t('ticket.lastReply'), align: 'right' as const, hideBelow: 'sm' as const },
])
</script>

<template>
  <div>
    <UiPageHeader :title="$t('admin.nav.tickets')" :description="$t('admin.ticket.subtitle')" />
    <div class="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <UiSegmented
        v-model="status"
        :options="
          (['all', 'open', 'customer_reply', 'answered', 'on_hold', 'closed'] as const).map((v) => ({
            value: v,
            label: v === 'all' ? $t('common.all') : $t(`status.ticket.${v}`),
          }))
        "
      />
      <div class="flex flex-col gap-2 sm:flex-row">
        <div class="sm:w-44">
          <UiSelect
            v-model="dept"
            size="sm"
            :options="[
              { value: '', label: $t('admin.ticket.allDepartments') },
              ...(departments.data.value ?? []).map((d) => ({ value: d.id, label: f.text(d.name) })),
            ]"
          />
        </div>
        <SearchInput v-model="q" />
      </div>
    </div>
    <div class="rounded-lg border border-line bg-surface shadow-xs">
      <UiErrorState v-if="list.isError.value" :error="list.error.value" @retry="list.refetch()" />
      <UiTable
        v-else
        :columns="columns"
        :rows="list.items.value"
        :row-key="(r) => r.id"
        :to="(r) => ({ name: 'admin-ticket', params: { id: r.id } })"
        :loading="list.isPending.value"
      >
        <template #cell-subject="{ row }">
          <p class="flex items-center gap-2 font-medium">
            {{ row.subject
            }}<UiBadge
              v-if="row.priority === 'urgent' || row.priority === 'high'"
              :tone="row.priority === 'urgent' ? 'danger' : 'warning'"
              >{{ $t(`ticket.priorityLabel.${row.priority}`) }}</UiBadge
            >
          </p>
          <p class="font-mono text-xs text-muted">#{{ row.number }}</p>
        </template>
        <template #cell-client="{ row }"
          ><span class="text-fg-2">{{ row.client_email }}</span></template
        >
        <template #cell-dept="{ row }"
          ><span class="text-muted">{{ deptName(row.department_id) }}</span></template
        >
        <template #cell-assignee="{ row }"
          ><span :class="row.assignee_name ? 'text-fg-2' : 'text-faint'">{{
            row.assignee_name ?? $t('admin.ticket.unassigned')
          }}</span></template
        >
        <template #cell-status="{ row }"><UiStatus kind="ticket" :value="row.status" /></template>
        <template #cell-updated="{ row }"><UiTime :value="row.last_reply_at" mode="relative" /></template>
        <template #empty><UiEmpty :icon="LifeBuoy" :title="$t('ticket.empty')" /></template>
      </UiTable>
      <UiLoadMore
        :has-more="!!list.hasNextPage.value"
        :loading="list.isFetchingNextPage.value"
        @more="list.fetchNextPage()"
      />
    </div>
  </div>
</template>
