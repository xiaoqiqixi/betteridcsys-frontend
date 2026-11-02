<script setup lang="ts">
import { ScrollText } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract/admin-endpoints'
import { useApiList } from '@/shared/api/query'
import UiEmpty from '@/shared/ui/UiEmpty.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiLoadMore from '@/shared/ui/UiLoadMore.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSegmented from '@/shared/ui/UiSegmented.vue'
import UiTable from '@/shared/ui/UiTable.vue'
import UiTime from '@/shared/ui/UiTime.vue'
import SearchInput from '../components/SearchInput.vue'
import { useQueryParam } from '../components/useQueryParam'

const { t } = useI18n()
const q = useQueryParam('q', '')
const actor = useQueryParam<'all' | 'client' | 'staff' | 'system'>('actor', 'all')
const list = useApiList(api.admin.audit, () => ({
  query: {
    limit: 50,
    ...(q.value ? { q: q.value } : {}),
    ...(actor.value === 'all' ? {} : { actor_type: actor.value }),
  },
}))
const columns = computed(() => [
  { key: 'at', label: t('admin.audit.time') },
  { key: 'actor', label: t('admin.audit.actor') },
  { key: 'action', label: t('admin.audit.action') },
  { key: 'target', label: t('admin.audit.target'), hideBelow: 'md' as const },
  { key: 'ip', label: 'IP', hideBelow: 'lg' as const },
])
</script>

<template>
  <div>
    <UiPageHeader :title="$t('admin.nav.audit')" :description="$t('admin.audit.subtitle')" />
    <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <UiSegmented
        v-model="actor"
        :options="
          (['all', 'staff', 'client', 'system'] as const).map((v) => ({
            value: v,
            label: v === 'all' ? $t('common.all') : $t(`admin.audit.actors.${v}`),
          }))
        "
      />
      <SearchInput v-model="q" :placeholder="$t('admin.audit.search')" />
    </div>
    <div class="rounded-lg border border-line bg-surface shadow-xs">
      <UiErrorState v-if="list.isError.value" :error="list.error.value" @retry="list.refetch()" />
      <UiTable
        v-else
        :columns="columns"
        :rows="list.items.value"
        :row-key="(r) => r.id"
        :loading="list.isPending.value"
      >
        <template #cell-at="{ row }"><UiTime :value="row.at" mode="datetime" class="text-[13px]" /></template>
        <template #cell-actor="{ row }"
          ><p class="text-[13px]">
            {{ row.actor_email ?? $t(`admin.audit.actors.${row.actor_type}`) }}
          </p></template
        >
        <template #cell-action="{ row }"
          ><p class="font-mono text-xs">{{ row.action }}</p>
          <p v-if="row.reason" class="max-w-xs truncate text-xs text-muted">“{{ row.reason }}”</p></template
        >
        <template #cell-target="{ row }"
          ><span v-if="row.target_type" class="font-mono text-xs text-muted"
            >{{ row.target_type }}/{{ row.target_id }}</span
          ></template
        >
        <template #cell-ip="{ row }"
          ><span class="font-mono text-xs text-faint">{{ row.ip }}</span></template
        >
        <template #empty><UiEmpty :icon="ScrollText" :title="$t('admin.audit.empty')" /></template>
      </UiTable>
      <UiLoadMore
        :has-more="!!list.hasNextPage.value"
        :loading="list.isFetchingNextPage.value"
        @more="list.fetchNextPage()"
      />
    </div>
  </div>
</template>
