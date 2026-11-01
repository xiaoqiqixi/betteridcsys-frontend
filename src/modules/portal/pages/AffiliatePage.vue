<script setup lang="ts">
import { Gift, Users } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract'
import { useApiList, useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import { useToast } from '@/shared/composables/toast'
import { parseDecimal } from '@/shared/lib/money'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiCopy from '@/shared/ui/UiCopy.vue'
import UiEmpty from '@/shared/ui/UiEmpty.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiLoadMore from '@/shared/ui/UiLoadMore.vue'
import UiMoney from '@/shared/ui/UiMoney.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiStat from '@/shared/ui/UiStat.vue'
import UiTable from '@/shared/ui/UiTable.vue'
import UiTime from '@/shared/ui/UiTime.vue'

const { t } = useI18n()
const f = useFormat()
const toast = useToast()
const errors = useErrorText()
const summary = useApiQuery(api.affiliate.summary)
const a = computed(() => summary.data.value)
const referrals = useApiList(api.affiliate.referrals, () => ({ query: { limit: 25 } }))
const activate = useApiMutation(api.affiliate.activate, { invalidates: [api.affiliate.summary] })
const amount = ref('')
const minor = computed(() => (a.value ? parseDecimal(amount.value, a.value.available.decimal_places) : null))
const withdraw = useApiMutation(api.affiliate.withdraw, {
  invalidates: [api.affiliate.summary, api.billing.credit],
  onSuccess: () => {
    amount.value = ''
    toast.success(t('affiliate.withdrawn'))
  },
})
const columns = computed(() => [
  { key: 'client', label: t('affiliate.client') },
  { key: 'joined', label: t('affiliate.joined'), hideBelow: 'sm' as const },
  { key: 'status', label: t('common.status') },
  { key: 'commissions', label: t('affiliate.commissions'), align: 'right' as const },
])
</script>

<template>
  <div>
    <UiPageHeader :title="$t('nav.affiliate')" :description="$t('affiliate.subtitle')" />
    <UiErrorState v-if="summary.isError.value" :error="summary.error.value" @retry="summary.refetch()" />
    <UiSkeleton v-else-if="!a" :lines="4" />
    <UiCard v-else-if="!a.enabled">
      <UiEmpty
        :icon="Gift"
        :title="$t('affiliate.joinTitle')"
        :description="$t('affiliate.joinBody', { pct: a.commission_percent })"
      >
        <UiButton
          variant="primary"
          :loading="activate.isPending.value"
          @click="activate.mutate({ body: {} })"
          >{{ $t('affiliate.join') }}</UiButton
        >
      </UiEmpty>
    </UiCard>
    <template v-else>
      <UiCard>
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="min-w-0">
            <p class="text-[13px] text-muted">{{ $t('affiliate.yourLink') }}</p>
            <UiCopy v-if="a.link" :text="a.link" mono class="mt-1 text-sm" />
          </div>
          <p class="text-[13px] text-muted">
            {{ $t('affiliate.terms', { pct: a.commission_percent, days: a.hold_days }) }}
          </p>
        </div>
      </UiCard>
      <div class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <UiStat :label="$t('affiliate.referrals')" :value="f.number(a.referrals)" :icon="Users" />
        <UiStat :label="$t('affiliate.pending')" :value="f.money(a.pending)" />
        <UiStat :label="$t('affiliate.available')" :value="f.money(a.available)" />
        <UiStat :label="$t('affiliate.paidOut')" :value="f.money(a.paid_out)" />
      </div>
      <UiCard class="mt-4" :title="$t('affiliate.withdrawTitle')" :description="$t('affiliate.withdrawHint')">
        <form
          class="flex max-w-md gap-2"
          @submit.prevent="minor && withdraw.mutate({ body: { amount_minor: minor } })"
        >
          <UiInput v-model="amount" inputmode="decimal" :placeholder="f.money(a.available)">
            <template #prefix
              ><span class="text-xs">{{ a.available.currency }}</span></template
            >
          </UiInput>
          <UiButton
            type="submit"
            variant="primary"
            :loading="withdraw.isPending.value"
            :disabled="!minor || minor > a.available.amount_minor || withdraw.uncertain.value"
            >{{ $t('affiliate.withdraw') }}</UiButton
          >
        </form>
        <p v-if="withdraw.error.value" class="mt-2 text-xs text-danger">
          {{ errors.text(withdraw.error.value) }}
        </p>
      </UiCard>
      <h2 class="mt-8 mb-3 text-[15px] font-semibold">{{ $t('affiliate.referrals') }}</h2>
      <div class="rounded-lg border border-line bg-surface shadow-xs">
        <UiTable
          :columns="columns"
          :rows="referrals.items.value"
          :row-key="(r) => r.id"
          :loading="referrals.isPending.value"
        >
          <template #cell-client="{ row }"
            ><span class="font-mono text-[13px]">{{ row.client }}</span></template
          >
          <template #cell-joined="{ row }"><UiTime :value="row.joined_at" /></template>
          <template #cell-status="{ row }"
            ><span class="text-[13px]" :class="row.status === 'converted' ? 'text-success' : 'text-muted'">{{
              $t(`affiliate.status.${row.status}`)
            }}</span></template
          >
          <template #cell-commissions="{ row }"><UiMoney :value="row.commissions" /></template>
          <template #empty><UiEmpty compact :icon="Users" :title="$t('affiliate.noReferrals')" /></template>
        </UiTable>
        <UiLoadMore
          :has-more="!!referrals.hasNextPage.value"
          :loading="referrals.isFetchingNextPage.value"
          @more="referrals.fetchNextPage()"
        />
      </div>
    </template>
  </div>
</template>
