<script setup lang="ts">
import { Printer } from '@lucide/vue'
import { computed, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/contract/client-endpoints'
import { useApiQuery } from '@/shared/api/query'
import { useFormat } from '@/shared/composables/format'
import { useSite } from '@/shared/composables/site'
import BrandMark from '@/shared/ui/BrandMark.vue'
import UiButton from '@/shared/ui/UiButton.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiMoney from '@/shared/ui/UiMoney.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiStatus from '@/shared/ui/UiStatus.vue'
import UiTime from '@/shared/ui/UiTime.vue'
import PaymentPanel from '../components/PaymentPanel.vue'

const route = useRoute()
const f = useFormat()
const site = useSite()
const pendingPayment = ref(false)
const invoice = useApiQuery(api.billing.invoice, () => ({ params: { id: String(route.params.id) } }), {
  refetchInterval: (): number | false => (pendingPayment.value ? 5000 : false),
})
const inv = computed(() => invoice.data.value)
watchEffect(() => (pendingPayment.value = !!inv.value?.payments.some((p) => p.status === 'pending')))
const print = () => window.print()
</script>

<template>
  <div>
    <UiErrorState v-if="invoice.isError.value" :error="invoice.error.value" @retry="invoice.refetch()" />
    <UiSkeleton v-else-if="!inv" :lines="8" />
    <template v-else>
      <UiPageHeader
        :title="`#${inv.number}`"
        back="/invoices"
        :back-label="$t('nav.invoices')"
        class="print:hidden"
      >
        <template #badges><UiStatus kind="invoice" :value="inv.status" /></template>
        <template #actions
          ><UiButton @click="print"><Printer class="size-4" />{{ $t('invoice.print') }}</UiButton></template
        >
      </UiPageHeader>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article
          class="rounded-xl border border-line bg-surface p-6 shadow-xs sm:p-10 print:border-0 print:p-0 print:shadow-none"
        >
          <header class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div class="flex items-center gap-2.5">
                <BrandMark :logo="site.settings.data.value?.logo" />
                <span class="text-base font-semibold">{{ inv.issuer.name || site.name.value }}</span>
              </div>
              <p class="mt-3 text-[13px] whitespace-pre-line text-muted">{{ inv.issuer.address }}</p>
            </div>
            <div class="sm:text-right">
              <p class="text-2xl font-semibold tracking-tight">{{ $t('invoice.document') }}</p>
              <p class="mt-1 font-mono text-[13px] text-muted">#{{ inv.number }}</p>
            </div>
          </header>

          <div class="mt-10 grid gap-6 text-[13px] sm:grid-cols-3">
            <div>
              <p class="text-xs font-medium tracking-wide text-faint uppercase">
                {{ $t('invoice.billedTo') }}
              </p>
              <p class="mt-2 font-medium text-fg">{{ inv.billed_to.name }}</p>
              <p v-if="inv.billed_to.company" class="text-fg-2">{{ inv.billed_to.company }}</p>
              <p class="whitespace-pre-line text-muted">{{ inv.billed_to.address }}</p>
            </div>
            <div>
              <p class="text-xs font-medium tracking-wide text-faint uppercase">{{ $t('invoice.issued') }}</p>
              <p class="mt-2"><UiTime :value="inv.issued_at" /></p>
              <p class="mt-3 text-xs font-medium tracking-wide text-faint uppercase">
                {{ $t('invoice.due') }}
              </p>
              <p class="mt-2"><UiTime :value="inv.due_at" /></p>
            </div>
            <div>
              <p class="text-xs font-medium tracking-wide text-faint uppercase">
                {{ $t('invoice.balanceDue') }}
              </p>
              <p class="num mt-2 text-xl font-semibold">{{ f.money(inv.balance_due) }}</p>
              <p v-if="inv.paid_at" class="mt-1 text-xs text-success">
                {{ $t('invoice.paidOn') }} <UiTime :value="inv.paid_at" />
              </p>
            </div>
          </div>

          <table class="mt-10 w-full text-[13px]">
            <thead>
              <tr class="border-b border-line text-left text-xs text-muted">
                <th class="pb-2 font-medium">{{ $t('invoice.description') }}</th>
                <th class="pb-2 text-right font-medium">{{ $t('invoice.amount') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(l, i) in inv.lines" :key="i" class="border-b border-line">
                <td class="py-3 pr-4">
                  <p class="text-fg">{{ l.description }}</p>
                  <p v-if="l.period" class="text-xs text-muted">{{ l.period }}</p>
                </td>
                <td class="num py-3 text-right">{{ f.money(l.amount) }}</td>
              </tr>
            </tbody>
          </table>
          <dl class="mt-5 ml-auto flex max-w-xs flex-col gap-2 text-[13px]">
            <div class="flex justify-between">
              <dt class="text-muted">{{ $t('checkout.subtotal') }}</dt>
              <dd class="num">{{ f.money(inv.subtotal) }}</dd>
            </div>
            <div v-if="inv.credit_applied.amount_minor" class="flex justify-between">
              <dt class="text-muted">{{ $t('invoice.creditApplied') }}</dt>
              <dd class="num">−{{ f.money(inv.credit_applied) }}</dd>
            </div>
            <div v-if="inv.amount_paid.amount_minor" class="flex justify-between">
              <dt class="text-muted">{{ $t('invoice.amountPaid') }}</dt>
              <dd class="num">−{{ f.money(inv.amount_paid) }}</dd>
            </div>
            <div class="flex justify-between border-t border-line pt-2 text-sm font-semibold">
              <dt>{{ $t('invoice.balanceDue') }}</dt>
              <dd class="num">{{ f.money(inv.balance_due) }}</dd>
            </div>
          </dl>

          <section v-if="inv.payments.length" class="mt-10">
            <p class="text-xs font-medium tracking-wide text-faint uppercase">{{ $t('invoice.payments') }}</p>
            <ul class="mt-3 divide-y divide-line rounded-lg border border-line">
              <li
                v-for="p in inv.payments"
                :key="p.id"
                class="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[13px]"
              >
                <span class="min-w-0 flex-1"
                  >{{ p.method === 'credit' ? $t('invoice.accountCredit') : p.gateway || $t('invoice.manual')
                  }}<span v-if="p.reference" class="ml-2 font-mono text-xs text-muted">{{
                    p.reference
                  }}</span></span
                >
                <UiTime :value="p.created_at" class="text-xs text-muted" />
                <UiStatus kind="payment" :value="p.status" />
                <UiMoney :value="p.amount" class="font-medium" />
              </li>
            </ul>
          </section>
        </article>

        <aside
          v-if="inv.status === 'unpaid' && inv.balance_due.amount_minor > 0"
          class="lg:sticky lg:top-24 lg:self-start print:hidden"
        >
          <div class="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <h2 class="mb-4 text-[15px] font-semibold">{{ $t('invoice.payWith') }}</h2>
            <PaymentPanel :invoice="inv" />
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>
