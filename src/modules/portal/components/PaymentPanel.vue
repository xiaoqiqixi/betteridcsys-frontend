<script setup lang="ts">
import { Building2, CreditCard, Landmark, QrCode, Wallet } from '@lucide/vue'
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract/client-endpoints'
import type { Invoice, PayResult } from '@/contract/commerce'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import { useToast } from '@/shared/composables/toast'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCopy from '@/shared/ui/UiCopy.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'
import UiQrCode from '@/shared/ui/UiQrCode.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'

/**
 * Pay an invoice with account credit or any enabled payment plugin. Gateways come from the
 * backend's plugin slots, so new providers appear here without frontend changes.
 */
const props = defineProps<{ invoice: Invoice }>()
const { t } = useI18n()
const f = useFormat()
const toast = useToast()
const errors = useErrorText()

const currency = computed(() => props.invoice.balance_due.currency)
const gateways = useApiQuery(api.site.gateways, () => ({ query: { currency: currency.value } }), {
  staleTime: 60_000,
})
const credit = useApiQuery(api.billing.credit)
const choice = ref<string>('')
const usable = computed(() =>
  (gateways.data.value ?? []).filter((g) => {
    if (!g.currencies.includes(currency.value)) return false
    const due = props.invoice.balance_due.amount_minor
    const min = g.min.find((m) => m.currency === currency.value)?.amount_minor ?? 0
    const max = g.max.find((m) => m.currency === currency.value)?.amount_minor
    return due >= min && (max === undefined || due <= max)
  }),
)
const creditBalance = computed(() =>
  credit.data.value?.balance.currency === currency.value ? credit.data.value.balance : null,
)
watch(
  [usable, creditBalance],
  () => {
    if (choice.value) return
    if (creditBalance.value && creditBalance.value.amount_minor >= props.invoice.balance_due.amount_minor)
      choice.value = 'credit'
    else choice.value = usable.value[0]?.id ?? (creditBalance.value?.amount_minor ? 'credit' : '')
  },
  { immediate: true },
)

const pending = ref<Extract<PayResult, { status: 'qr' | 'instructions' }> | null>(null)
const pay = useApiMutation(api.billing.pay, {
  invalidates: [api.billing.invoice, api.billing.invoices, api.billing.credit, api.account.overview],
  onSuccess: (r) => {
    if (r.status === 'paid') {
      toast.success(r.invoice.status === 'paid' ? t('invoice.paid') : t('invoice.creditApplied'))
    } else if (r.status === 'redirect') {
      if (/^https:\/\//.test(r.checkout_url)) window.location.assign(r.checkout_url)
      else toast.error(t('errors.INVALID_RESPONSE'))
    } else pending.value = r
  },
})
function submit() {
  if (!choice.value) return
  pay.mutate({
    params: { id: props.invoice.id },
    body: choice.value === 'credit' ? { method: 'credit' } : { method: 'gateway', gateway_id: choice.value },
  })
}

// Poll QR payments until the plugin reports a terminal state.
const statusInput = computed(() =>
  pending.value?.status === 'qr'
    ? { params: { id: props.invoice.id, payment_id: pending.value.payment_id } }
    : null,
)
const status = useApiQuery(api.billing.paymentStatus, statusInput, { refetchInterval: 3000 })
watch(
  () => status.data.value?.status,
  (st) => {
    if (st === 'succeeded') {
      pending.value = null
      toast.success(t('invoice.paid'))
      pay.newAttempt()
      void gateways.refetch()
    } else if (st === 'expired' || st === 'failed' || st === 'voided') {
      pending.value = null
      toast.error(t('invoice.paymentExpired'))
      pay.newAttempt()
    }
  },
)
const now = ref(Date.now())
const tick = setInterval(() => (now.value = Date.now()), 1000)
onUnmounted(() => clearInterval(tick))
const remaining = computed(() => {
  const exp = pending.value?.expires_at
  if (!exp) return null
  const s = Math.max(0, Math.floor((new Date(exp).getTime() - now.value) / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})
const icon = (i: string) => ({ card: CreditCard, crypto: Wallet, bank: Landmark, qr: QrCode })[i] ?? Building2
const qrOpen = computed({
  get: () => pending.value?.status === 'qr',
  set: (v) => !v && (pending.value = null),
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <UiSkeleton v-if="gateways.isPending.value" :lines="3" height="h-12" />
    <template v-else>
      <div class="grid min-w-0 grid-cols-1 gap-2" role="radiogroup" :aria-label="$t('invoice.payWith')">
        <button
          v-if="creditBalance && creditBalance.amount_minor > 0"
          type="button"
          role="radio"
          :aria-checked="choice === 'credit'"
          :class="[
            'flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
            choice === 'credit'
              ? 'border-primary bg-primary-soft ring-1 ring-primary'
              : 'border-line hover:border-line-strong',
          ]"
          @click="choice = 'credit'"
        >
          <span class="grid size-9 place-items-center rounded-md bg-primary-soft text-primary"
            ><Wallet class="size-4"
          /></span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium">{{ $t('invoice.accountCredit') }}</span>
            <span class="block text-xs text-fg-2">{{
              $t('checkout.creditAvailable', { amount: f.money(creditBalance) })
            }}</span>
          </span>
        </button>
        <button
          v-for="g in usable"
          :key="g.id"
          type="button"
          role="radio"
          :aria-checked="choice === g.id"
          :class="[
            'flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
            choice === g.id
              ? 'border-primary bg-primary-soft ring-1 ring-primary'
              : 'border-line hover:border-line-strong',
          ]"
          @click="choice = g.id"
        >
          <img
            v-if="g.logo"
            :src="g.logo"
            alt=""
            class="size-9 rounded-md border border-line bg-white object-contain p-1"
          />
          <span v-else class="grid size-9 place-items-center rounded-md bg-surface-2 text-muted"
            ><component
              :is="icon(g.flow === 'qr' ? 'qr' : g.flow === 'instructions' ? 'bank' : 'card')"
              class="size-4"
          /></span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium">{{ f.text(g.name) }}</span>
            <span v-if="g.description" class="block truncate text-xs text-fg-2">{{
              f.text(g.description)
            }}</span>
          </span>
          <span v-if="g.fee" class="text-xs text-muted">{{
            $t('invoice.fee', { pct: (g.fee.percent_bp / 100).toFixed(g.fee.percent_bp % 100 ? 1 : 0) })
          }}</span>
        </button>
        <p
          v-if="!usable.length && !(creditBalance && creditBalance.amount_minor > 0)"
          class="rounded-lg border border-dashed border-line px-4 py-6 text-center text-[13px] text-muted"
        >
          {{ $t('invoice.noMethods') }}
        </p>
      </div>
      <p
        v-if="pay.uncertain.value"
        class="rounded-md bg-warning-soft px-3 py-2 text-[13px] text-warning"
        role="alert"
      >
        {{ $t('invoice.payUncertain') }}
      </p>
      <p v-else-if="pay.error.value" class="text-[13px] text-danger" role="alert">
        {{ errors.text(pay.error.value) }}
      </p>
      <UiButton
        variant="primary"
        size="lg"
        block
        :disabled="!choice || pay.uncertain.value"
        :loading="pay.isPending.value"
        @click="submit"
      >
        {{ $t('invoice.payAmount', { amount: f.money(invoice.balance_due) }) }}
      </UiButton>
    </template>

    <div v-if="pending?.status === 'instructions'" class="rounded-lg border border-line bg-surface-2 p-4">
      <p class="text-sm font-medium">{{ $t('invoice.transferTitle') }}</p>
      <p class="mt-2 text-[13px] leading-relaxed whitespace-pre-line text-fg-2">{{ pending.instructions }}</p>
      <dl class="mt-3 grid gap-2 text-[13px]">
        <div class="flex justify-between gap-3">
          <dt class="text-muted">{{ $t('invoice.amount') }}</dt>
          <dd class="num font-medium">{{ f.money(pending.amount) }}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-muted">{{ $t('invoice.reference') }}</dt>
          <dd><UiCopy :text="pending.reference" mono /></dd>
        </div>
      </dl>
      <p class="mt-3 text-xs text-muted">{{ $t('invoice.transferHint') }}</p>
    </div>

    <UiDialog v-model:open="qrOpen" :title="$t('invoice.scanTitle')" size="sm">
      <div v-if="pending?.status === 'qr'" class="flex flex-col items-center gap-4 py-2 text-center">
        <UiQrCode :value="pending.qr_payload" :label="$t('invoice.scanTitle')" />
        <p class="num text-xl font-semibold">{{ f.money(pending.amount) }}</p>
        <p class="text-[13px] text-muted">
          {{ $t('invoice.scanHint') }}<template v-if="remaining"> · {{ remaining }}</template>
        </p>
      </div>
    </UiDialog>
  </div>
</template>
