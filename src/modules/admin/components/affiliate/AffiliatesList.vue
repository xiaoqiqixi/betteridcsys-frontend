<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract/admin-endpoints'
import { useApiList } from '@/shared/api/query'
import UiButton from '@/shared/ui/UiButton.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiLoadMore from '@/shared/ui/UiLoadMore.vue'
import UiMoney from '@/shared/ui/UiMoney.vue'
import UiSelect from '@/shared/ui/UiSelect.vue'
import UiSheet from '@/shared/ui/UiSheet.vue'
import UiTable from '@/shared/ui/UiTable.vue'
import SearchInput from '../SearchInput.vue'
import AffiliateDetail from './AffiliateDetail.vue'
const { t } = useI18n()
const q = ref('')
const status = ref<'all' | 'active' | 'suspended'>('all')
const list = useApiList(api.admin.affiliates, () => ({
  query: {
    limit: 25,
    ...(q.value ? { q: q.value } : {}),
    ...(status.value === 'all' ? {} : { status: status.value }),
  },
}))
const selected = ref('')
const open = ref(false)
function show(id: string) {
  selected.value = id
  open.value = true
}
const columns = computed(() => [
  { key: 'client', label: t('affiliate.client') },
  { key: 'referrals', label: t('affiliate.referrals'), hideBelow: 'sm' as const },
  { key: 'balances', label: t('affiliate.available'), hideBelow: 'md' as const },
  { key: 'status', label: t('common.status') },
])
</script>
<template>
  <section class="mt-8">
    <h2 class="mb-4 text-lg font-semibold">{{ $t('affAdmin.affiliates') }}</h2>
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:justify-between">
      <SearchInput v-model="q" :placeholder="$t('affAdmin.search')" />
      <UiSelect
        v-model="status"
        class="sm:max-w-48"
        :aria-label="$t('common.status')"
        :options="
          (['all', 'active', 'suspended'] as const).map((value) => ({
            value,
            label: value === 'all' ? $t('common.all') : $t(`affAdmin.status.${value}`),
          }))
        "
      />
    </div>
    <UiErrorState v-if="list.isError.value" :error="list.error.value" @retry="list.refetch()" />
    <div v-else class="overflow-hidden rounded-lg border border-line bg-surface">
      <UiTable
        :columns="columns"
        :rows="list.items.value"
        :row-key="(r) => r.id"
        :loading="list.isPending.value"
      >
        <template #cell-client="{ row }"
          ><UiButton variant="ghost" class="max-w-full" @click="show(row.id)"
            ><span class="truncate">{{ row.name || row.email }}</span></UiButton
          >
          <p class="max-w-48 truncate text-xs text-muted">{{ row.email }}</p></template
        >
        <template #cell-referrals="{ row }">{{ row.referrals }}</template>
        <template #cell-balances="{ row }"
          ><p v-for="b in row.balances" :key="b.currency">{{ b.currency }} <UiMoney :value="b.available" /></p
        ></template>
        <template #cell-status="{ row }">{{ $t(`affAdmin.status.${row.status}`) }}</template>
        <template #empty
          ><p class="p-6 text-center text-sm text-muted">{{ $t('affAdmin.empty') }}</p></template
        >
      </UiTable>
      <UiLoadMore
        :has-more="!!list.hasNextPage.value"
        :loading="list.isFetchingNextPage.value"
        @more="list.fetchNextPage()"
      />
    </div>
    <UiSheet v-model:open="open" :title="$t('affAdmin.detail')"
      ><AffiliateDetail v-if="open" :key="selected" :id="selected"
    /></UiSheet>
  </section>
</template>
