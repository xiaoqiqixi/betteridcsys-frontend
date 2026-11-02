<script setup lang="ts">
import { Wallet } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { api } from '@/contract/client-endpoints'
import { useApiList, useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import { parseDecimal } from '@/shared/lib/money'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiEmpty from '@/shared/ui/UiEmpty.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiLoadMore from '@/shared/ui/UiLoadMore.vue'
import UiMoney from '@/shared/ui/UiMoney.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiTable from '@/shared/ui/UiTable.vue'
import UiTime from '@/shared/ui/UiTime.vue'

const { t } = useI18n()
const router = useRouter()
const f = useFormat()
const errors = useErrorText()
const credit = useApiQuery(api.billing.credit)
const entries = useApiList(api.billing.creditEntries, { query: { limit: 25 } })
const c = computed(() => credit.data.value)
const amount = ref('')
const minor = computed(() => (c.value ? parseDecimal(amount.value, c.value.balance.decimal_places) : null))
const rangeError = computed(() => {
  if (!c.value || !amount.value) return null
  if (minor.value === null) return t('billing.invalidAmount')
  if (minor.value < c.value.top_up.min.amount_minor)
    return t('billing.min', { amount: f.money(c.value.top_up.min) })
  if (minor.value > c.value.top_up.max.amount_minor)
    return t('billing.max', { amount: f.money(c.value.top_up.max) })
  return null
})
const topUp = useApiMutation(api.billing.topUp, {
  onSuccess: (inv) => router.push({ name: 'invoice', params: { id: inv.id } }),
})
const columns = computed(() => [
  { key: 'desc', label: t('invoice.description') },
  { key: 'at', label: t('common.created'), hideBelow: 'sm' as const },
  { key: 'amount', label: t('invoice.amount'), align: 'right' as const },
  { key: 'balance', label: t('billing.balanceAfter'), align: 'right' as const, hideBelow: 'md' as const },
])
</script>

<template>
  <div>
    <UiPageHeader :title="$t('nav.credit')" :description="$t('billing.subtitle')" />
    <UiErrorState v-if="credit.isError.value" :error="credit.error.value" @retry="credit.refetch()" />
    <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div class="relative overflow-hidden rounded-xl border border-line bg-surface p-6 shadow-xs">
        <div class="glow pointer-events-none absolute inset-0 opacity-60" />
        <div class="relative">
          <p class="flex items-center gap-2 text-[13px] text-muted">
            <Wallet class="size-4" />{{ $t('billing.balance') }}
          </p>
          <UiSkeleton v-if="!c" height="h-10" class="mt-3 max-w-[200px]" />
          <p v-else class="num mt-2 text-[40px] leading-none font-semibold tracking-tight">
            {{ f.money(c.balance) }}
          </p>
          <p class="mt-3 text-[13px] text-muted">{{ $t('billing.balanceHint') }}</p>
        </div>
      </div>
      <UiCard :title="$t('billing.topUp')" :description="$t('billing.topUpHint')">
        <div v-if="c" class="flex flex-col gap-4">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="p in c.top_up.presets"
              :key="p.amount_minor"
              type="button"
              :class="[
                'num h-9 rounded-md border px-4 text-sm transition-colors',
                minor === p.amount_minor
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-line hover:border-line-strong',
              ]"
              @click="amount = (p.amount_minor / 10 ** p.decimal_places).toFixed(p.decimal_places)"
            >
              {{ f.money(p) }}
            </button>
          </div>
          <form
            class="flex gap-2"
            @submit.prevent="minor && !rangeError && topUp.mutate({ body: { amount_minor: minor } })"
          >
            <UiInput
              v-model="amount"
              :aria-label="$t('billing.customAmount')"
              inputmode="decimal"
              :placeholder="$t('billing.customAmount')"
              :invalid="!!rangeError"
              class="min-w-0 flex-1"
            >
              <template #prefix
                ><span class="text-xs">{{ c.balance.currency }}</span></template
              >
            </UiInput>
            <UiButton
              type="submit"
              variant="primary"
              :loading="topUp.isPending.value"
              :disabled="!minor || !!rangeError || topUp.uncertain.value"
              >{{ $t('billing.continue') }}</UiButton
            >
          </form>
          <p v-if="rangeError" class="-mt-2 text-xs text-danger" role="alert">{{ rangeError }}</p>
          <p v-else-if="topUp.error.value" class="-mt-2 text-xs text-danger" role="alert">
            {{ errors.text(topUp.error.value) }}
          </p>
        </div>
        <UiSkeleton v-else :lines="2" />
      </UiCard>
    </div>

    <h2 class="mt-10 mb-3 text-[15px] font-semibold">{{ $t('billing.history') }}</h2>
    <div class="rounded-lg border border-line bg-surface shadow-xs">
      <UiErrorState v-if="entries.isError.value" :error="entries.error.value" @retry="entries.refetch()" />
      <UiTable
        v-else
        :columns="columns"
        :rows="entries.items.value"
        :row-key="(r) => r.id"
        :loading="entries.isPending.value"
      >
        <template #cell-desc="{ row }">
          <p class="font-medium text-fg">{{ $t(`billing.kind.${row.kind}`) }}</p>
          <p class="text-xs text-muted">
            {{ row.description }}
            <RouterLink
              v-if="row.invoice_id"
              :to="{ name: 'invoice', params: { id: row.invoice_id } }"
              class="text-primary underline underline-offset-2"
              >{{ $t('billing.viewInvoice') }}</RouterLink
            >
          </p>
        </template>
        <template #cell-at="{ row }"><UiTime :value="row.created_at" mode="datetime" /></template>
        <template #cell-amount="{ row }"><UiMoney :value="row.amount" signed class="font-medium" /></template>
        <template #cell-balance="{ row }"><UiMoney :value="row.balance_after" class="text-muted" /></template>
        <template #empty><UiEmpty compact :icon="Wallet" :title="$t('billing.empty')" /></template>
      </UiTable>
      <UiLoadMore
        :has-more="!!entries.hasNextPage.value"
        :loading="entries.isFetchingNextPage.value"
        @more="entries.fetchNextPage()"
      />
    </div>
  </div>
</template>
