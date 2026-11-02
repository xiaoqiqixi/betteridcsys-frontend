<script setup lang="ts">
import { ArrowRight, CalendarClock, LifeBuoy, Plus, Receipt, Server, Wallet } from '@lucide/vue'
import { computed } from 'vue'
import { api } from '@/contract/client-endpoints'
import { useApiQuery } from '@/shared/api/query'
import { useFormat } from '@/shared/composables/format'
import { useSession } from '@/shared/stores/session'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiEmpty from '@/shared/ui/UiEmpty.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiMoney from '@/shared/ui/UiMoney.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiStat from '@/shared/ui/UiStat.vue'
import UiStatus from '@/shared/ui/UiStatus.vue'
import UiTime from '@/shared/ui/UiTime.vue'
import VerifyEmailBanner from '../components/VerifyEmailBanner.vue'

const f = useFormat()
const session = useSession()
const overview = useApiQuery(api.account.overview)
const o = computed(() => overview.data.value)
const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 6 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
})
</script>

<template>
  <div>
    <VerifyEmailBanner />
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-[22px] font-semibold tracking-tight">
          {{ $t(`portal.greeting.${greeting}`, { name: session.user?.name || '' }) }}
        </h1>
        <p class="mt-1 text-sm text-muted">{{ $t('portal.dashboardSubtitle') }}</p>
      </div>
      <UiButton to="/store" variant="primary"><Plus class="size-4" />{{ $t('nav.newService') }}</UiButton>
    </div>

    <UiErrorState v-if="overview.isError.value" :error="overview.error.value" @retry="overview.refetch()" />
    <template v-else>
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <template v-if="!o"><div v-for="i in 4" :key="i" class="skeleton h-[104px] rounded-lg" /></template>
        <template v-else>
          <UiStat
            :label="$t('portal.stats.services')"
            :value="f.number(o.counts.active_services)"
            :icon="Server"
            to="/services"
          />
          <UiStat
            :label="$t('portal.stats.due')"
            :value="f.money(o.amount_due)"
            :hint="$t('portal.stats.unpaid', { n: o.counts.unpaid_invoices })"
            :icon="Receipt"
            to="/invoices"
          />
          <UiStat
            :label="$t('portal.stats.credit')"
            :value="f.money(o.credit)"
            :icon="Wallet"
            to="/billing"
          />
          <UiStat
            :label="$t('portal.stats.tickets')"
            :value="f.number(o.counts.open_tickets)"
            :icon="LifeBuoy"
            to="/tickets"
          />
        </template>
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <UiCard :title="$t('nav.services')" :padded="false">
          <template #actions
            ><UiButton to="/services" variant="ghost" size="sm"
              >{{ $t('portal.viewAll') }}<ArrowRight class="size-3.5" /></UiButton
          ></template>
          <div v-if="!o" class="p-5"><UiSkeleton :lines="4" /></div>
          <UiEmpty
            v-else-if="!o.services.length"
            compact
            :icon="Server"
            :title="$t('portal.noServices')"
            :description="$t('portal.noServicesBody')"
          >
            <UiButton to="/store" variant="primary" size="sm">{{ $t('home.ctaPrimary') }}</UiButton>
          </UiEmpty>
          <ul v-else class="divide-y divide-line">
            <li v-for="s in o.services" :key="s.id">
              <RouterLink
                :to="{ name: 'service', params: { id: s.id } }"
                class="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2"
              >
                <span
                  class="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-muted"
                  ><Server class="size-4"
                /></span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-fg">
                    {{ s.label || s.hostname || s.product_name }}
                  </p>
                  <p class="truncate text-xs text-muted">
                    {{ s.product_name }} · {{ s.region
                    }}<template v-if="s.primary_ipv4">
                      · <span class="font-mono">{{ s.primary_ipv4 }}</span></template
                    >
                  </p>
                </div>
                <div class="hidden text-right text-xs text-muted sm:block">
                  <p>{{ $t('portal.renews') }}</p>
                  <UiTime :value="s.next_due_at" />
                </div>
                <UiStatus kind="service" :value="s.status" />
              </RouterLink>
            </li>
          </ul>
        </UiCard>

        <div class="flex flex-col gap-6">
          <UiCard :title="$t('portal.unpaidInvoices')" :padded="false">
            <div v-if="!o" class="p-5"><UiSkeleton :lines="3" /></div>
            <p v-else-if="!o.invoices.length" class="px-5 py-6 text-center text-[13px] text-muted">
              {{ $t('portal.allPaid') }}
            </p>
            <ul v-else class="divide-y divide-line">
              <li v-for="inv in o.invoices" :key="inv.id">
                <RouterLink
                  :to="{ name: 'invoice', params: { id: inv.id } }"
                  class="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2"
                >
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-fg">#{{ inv.number }}</p>
                    <p class="flex items-center gap-1 text-xs text-muted">
                      <CalendarClock class="size-3" />{{ $t('portal.dueOn') }} <UiTime :value="inv.due_at" />
                    </p>
                  </div>
                  <UiMoney :value="inv.balance_due" class="text-sm font-semibold" />
                </RouterLink>
              </li>
            </ul>
          </UiCard>

          <UiCard :title="$t('store.nav.announcements')" :padded="false">
            <div v-if="!o" class="p-5"><UiSkeleton :lines="3" /></div>
            <p v-else-if="!o.announcements.length" class="px-5 py-6 text-center text-[13px] text-muted">
              {{ $t('announcements.empty') }}
            </p>
            <ul v-else class="divide-y divide-line">
              <li v-for="a in o.announcements" :key="a.id" class="px-5 py-3">
                <p class="text-sm font-medium text-fg">{{ f.text(a.title) }}</p>
                <p class="mt-0.5 line-clamp-2 text-xs text-muted">{{ f.text(a.body) }}</p>
              </li>
            </ul>
          </UiCard>
        </div>
      </div>
    </template>
  </div>
</template>
