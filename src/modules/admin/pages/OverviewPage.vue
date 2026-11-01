<script setup lang="ts">
import { AlertTriangle, ArrowRight, LifeBuoy, Receipt, Server, ShoppingBag, Users } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract'
import { useApiQuery } from '@/shared/api/query'
import { useFormat } from '@/shared/composables/format'
import { useSite } from '@/shared/composables/site'
import UiAreaChart from '@/shared/ui/UiAreaChart.vue'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSelect from '@/shared/ui/UiSelect.vue'
import UiStat from '@/shared/ui/UiStat.vue'
import UiTime from '@/shared/ui/UiTime.vue'

const { t } = useI18n()
const f = useFormat()
const site = useSite()
const currency = ref('')
const effective = computed(() => currency.value || site.currencies.data.value?.default_currency || '')
const overview = useApiQuery(
  api.admin.overview,
  () => (effective.value ? { query: { currency: effective.value } } : null),
  { refetchInterval: 60_000, keepPrevious: true },
)
const o = computed(() => overview.data.value)
const delta = computed(() => {
  const cur = o.value?.revenue_month.amount_minor ?? 0
  const prev = o.value?.revenue_prev_month.amount_minor ?? 0
  return prev ? ((cur - prev) / prev) * 100 : null
})
const series = computed(() => o.value?.revenue_series ?? [])
const decimals = computed(() => o.value?.revenue_month.decimal_places ?? 2)
const attentionLink = (kind: string, id: string) =>
  ({
    provisioning_failed: { name: 'admin-service', params: { id } },
    task_uncertain: { name: 'admin-service', params: { id } },
    duplicate_payment: { name: 'admin-invoice', params: { id } },
    ticket_waiting: { name: 'admin-ticket', params: { id } },
    cancellation_request: { name: 'admin-service', params: { id } },
  })[kind] ?? { name: 'admin' }
</script>

<template>
  <div>
    <UiPageHeader :title="$t('admin.nav.overview')" :description="$t('admin.overview.subtitle')">
      <template #actions>
        <div class="w-36">
          <UiSelect
            v-model="currency"
            size="sm"
            :options="
              (site.currencies.data.value?.currencies ?? []).map((c) => ({ value: c.code, label: c.code }))
            "
            :placeholder="effective"
          />
        </div>
      </template>
    </UiPageHeader>
    <UiErrorState v-if="overview.isError.value" :error="overview.error.value" @retry="overview.refetch()" />
    <template v-else>
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <template v-if="!o"><div v-for="i in 4" :key="i" class="skeleton h-[104px] rounded-lg" /></template>
        <template v-else>
          <UiStat
            :label="$t('admin.overview.revenueMonth')"
            :value="f.money(o.revenue_month)"
            :delta="delta"
            :hint="$t('admin.overview.today', { amount: f.money(o.revenue_today) })"
          />
          <UiStat
            :label="$t('admin.overview.outstanding')"
            :value="f.money(o.outstanding)"
            :hint="$t('admin.overview.overdue', { n: o.counts.overdue_invoices })"
            :icon="Receipt"
            to="/admin/invoices?status=unpaid"
          />
          <UiStat
            :label="$t('admin.overview.activeServices')"
            :value="f.number(o.counts.active_services)"
            :icon="Server"
            to="/admin/services?status=active"
          />
          <UiStat
            :label="$t('admin.overview.clients')"
            :value="f.number(o.counts.clients)"
            :hint="$t('admin.overview.newClients', { n: o.counts.new_clients_month })"
            :icon="Users"
            to="/admin/clients"
          />
        </template>
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <UiCard :title="$t('admin.overview.revenue30')">
          <div v-if="!o" class="skeleton h-[220px] rounded-md" />
          <UiAreaChart
            v-else
            :values="series.map((p) => p.amount.amount_minor / 10 ** decimals)"
            :labels="series.map((p) => f.date(p.date + 'T00:00:00Z'))"
            :height="220"
            :format="
              (v) =>
                f.money({
                  currency: effective,
                  amount_minor: Math.round(v * 10 ** decimals),
                  decimal_places: decimals,
                })
            "
          />
        </UiCard>
        <UiCard :title="$t('admin.overview.attention')" :padded="false">
          <div class="grid grid-cols-2 border-b border-line">
            <RouterLink
              to="/admin/orders?status=pending_payment"
              class="flex items-center gap-3 border-r border-line px-5 py-4 hover:bg-surface-2"
            >
              <ShoppingBag class="size-4 text-muted" />
              <div>
                <p class="num text-lg font-semibold">{{ o?.counts.pending_orders ?? '—' }}</p>
                <p class="text-xs text-muted">{{ $t('admin.overview.pendingOrders') }}</p>
              </div>
            </RouterLink>
            <RouterLink
              to="/admin/tickets?status=customer_reply"
              class="flex items-center gap-3 px-5 py-4 hover:bg-surface-2"
            >
              <LifeBuoy class="size-4 text-muted" />
              <div>
                <p class="num text-lg font-semibold">{{ o?.counts.open_tickets ?? '—' }}</p>
                <p class="text-xs text-muted">{{ $t('admin.overview.openTickets') }}</p>
              </div>
            </RouterLink>
          </div>
          <p v-if="o && !o.attention.length" class="px-5 py-8 text-center text-[13px] text-muted">
            {{ $t('admin.overview.allClear') }}
          </p>
          <ul v-else class="divide-y divide-line">
            <li v-for="a in o?.attention ?? []" :key="a.kind + a.ref_id">
              <RouterLink
                :to="attentionLink(a.kind, a.ref_id)"
                class="flex items-start gap-3 px-5 py-3 hover:bg-surface-2"
              >
                <AlertTriangle
                  class="mt-0.5 size-4 shrink-0"
                  :class="
                    a.kind === 'duplicate_payment' || a.kind === 'provisioning_failed'
                      ? 'text-danger'
                      : 'text-warning'
                  "
                />
                <div class="min-w-0 flex-1">
                  <p class="text-[13px] font-medium">{{ t(`admin.overview.kind.${a.kind}`) }}</p>
                  <p class="truncate text-xs text-muted">{{ a.title }}</p>
                </div>
                <UiTime :value="a.at" mode="relative" class="shrink-0 text-xs text-faint" />
              </RouterLink>
            </li>
          </ul>
        </UiCard>
      </div>
      <div class="mt-6 flex flex-wrap gap-2">
        <UiButton to="/admin/clients" size="sm" variant="ghost"
          >{{ $t('admin.nav.clients') }}<ArrowRight class="size-3.5"
        /></UiButton>
        <UiButton to="/admin/services" size="sm" variant="ghost"
          >{{ $t('admin.nav.services') }}<ArrowRight class="size-3.5"
        /></UiButton>
        <UiButton to="/admin/automation" size="sm" variant="ghost"
          >{{ $t('admin.nav.automation') }}<ArrowRight class="size-3.5"
        /></UiButton>
      </div>
    </template>
  </div>
</template>
