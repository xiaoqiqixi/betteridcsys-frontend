<script setup lang="ts">
import { AlertTriangle, Ban, Banknote, Undo2 } from '@lucide/vue'
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { api } from '@/contract'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import { useToast } from '@/shared/composables/toast'
import { parseDecimal } from '@/shared/lib/money'
import { useSession } from '@/shared/stores/session'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiMoney from '@/shared/ui/UiMoney.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSegmented from '@/shared/ui/UiSegmented.vue'
import UiSelect from '@/shared/ui/UiSelect.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiStatus from '@/shared/ui/UiStatus.vue'
import UiTextarea from '@/shared/ui/UiTextarea.vue'
import UiTime from '@/shared/ui/UiTime.vue'
import ReasonDialog from '../components/ReasonDialog.vue'

const route = useRoute()
const { t } = useI18n()
const f = useFormat()
const toast = useToast()
const errors = useErrorText()
const session = useSession()
const id = computed(() => String(route.params.id))
const invoice = useApiQuery(api.admin.invoice, () => ({ params: { id: id.value } }))
const inv = computed(() => invoice.data.value)
const dec = computed(() => inv.value?.total.decimal_places ?? 2)
const inval = [api.admin.invoice, api.admin.invoices]
const fail = (e: unknown) => toast.error(errors.text(e))

const payOpen = ref(false)
const pay = reactive({
  amount: '',
  method: 'bank_transfer' as 'bank_transfer' | 'cash' | 'other',
  reference: '',
  received: new Date().toISOString().slice(0, 10),
})
const payMinor = computed(() => parseDecimal(pay.amount, dec.value))
const addPayment = useApiMutation(api.admin.addPayment, {
  invalidates: inval,
  onSuccess: () => {
    payOpen.value = false
    toast.success(t('admin.invoice.paymentRecorded'))
  },
})

const refundOpen = ref(false)
const refund = reactive({
  payment_id: '',
  amount: '',
  destination: 'credit' as 'credit' | 'original',
  reason: '',
})
const refundMinor = computed(() => parseDecimal(refund.amount, dec.value))
const refundable = computed(() => inv.value?.payments.filter((p) => p.status === 'succeeded') ?? [])
const doRefund = useApiMutation(api.admin.refund, {
  invalidates: inval,
  onSuccess: () => {
    refundOpen.value = false
    toast.success(t('admin.invoice.refunded'))
  },
})

const cancelOpen = ref(false)
const cancel = useApiMutation(api.admin.cancelInvoice, {
  invalidates: inval,
  onSuccess: () => {
    cancelOpen.value = false
  },
})
const voidTarget = ref<string | null>(null)
const voidOpen = computed({ get: () => !!voidTarget.value, set: (v) => !v && (voidTarget.value = null) })
const voidAttempt = useApiMutation(api.admin.voidPaymentAttempt, {
  invalidates: inval,
  onSuccess: () => (voidTarget.value = null),
})
function openPay() {
  if (inv.value) pay.amount = (inv.value.balance_due.amount_minor / 10 ** dec.value).toFixed(dec.value)
  payOpen.value = true
}
</script>

<template>
  <div>
    <UiErrorState v-if="invoice.isError.value" :error="invoice.error.value" @retry="invoice.refetch()" />
    <UiSkeleton v-else-if="!inv" :lines="8" />
    <template v-else>
      <UiPageHeader :title="`#${inv.number}`" back="/admin/invoices" :back-label="$t('admin.nav.invoices')">
        <template #badges><UiStatus kind="invoice" :value="inv.status" /></template>
        <template #meta
          ><p class="mt-1 text-[13px] text-muted">
            <RouterLink
              :to="{ name: 'admin-client', params: { id: inv.client_id } }"
              class="text-fg-2 hover:text-primary"
              >{{ inv.client_email }}</RouterLink
            >
            · {{ $t(`invoice.kind.${inv.kind}`) }} · {{ $t('invoice.due') }} <UiTime :value="inv.due_at" /></p
        ></template>
        <template #actions>
          <UiButton
            v-if="inv.status === 'unpaid' && session.can('invoices.write')"
            variant="primary"
            @click="openPay"
            ><Banknote class="size-4" />{{ $t('admin.invoice.recordPayment') }}</UiButton
          >
          <UiButton v-if="refundable.length && session.can('invoices.refund')" @click="refundOpen = true"
            ><Undo2 class="size-4" />{{ $t('admin.invoice.refund') }}</UiButton
          >
          <UiButton
            v-if="inv.status === 'unpaid' && session.can('invoices.write')"
            variant="danger-ghost"
            @click="cancelOpen = true"
            ><Ban class="size-4" />{{ $t('admin.invoice.cancel') }}</UiButton
          >
        </template>
      </UiPageHeader>

      <div
        v-if="inv.flags.includes('duplicate_payment')"
        class="mb-5 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-[13px] text-danger"
      >
        <AlertTriangle class="mt-0.5 size-4 shrink-0" />{{ $t('admin.invoice.duplicateWarning') }}
      </div>

      <div class="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <UiCard :padded="false">
          <table class="w-full text-[13px]">
            <tbody>
              <tr v-for="(l, i) in inv.lines" :key="i" class="border-b border-line">
                <td class="px-5 py-3">
                  <p>{{ l.description }}</p>
                  <p v-if="l.period" class="text-xs text-muted">{{ l.period }}</p>
                </td>
                <td class="num px-5 py-3 text-right">{{ f.money(l.amount) }}</td>
              </tr>
            </tbody>
          </table>
          <dl class="ml-auto flex max-w-xs flex-col gap-2 px-5 py-4 text-[13px]">
            <div class="flex justify-between">
              <dt class="text-muted">{{ $t('checkout.subtotal') }}</dt>
              <dd class="num">{{ f.money(inv.subtotal) }}</dd>
            </div>
            <div v-if="inv.credit_applied.amount_minor" class="flex justify-between">
              <dt class="text-muted">{{ $t('invoice.creditApplied') }}</dt>
              <dd class="num">−{{ f.money(inv.credit_applied) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">{{ $t('invoice.amountPaid') }}</dt>
              <dd class="num">{{ f.money(inv.amount_paid) }}</dd>
            </div>
            <div class="flex justify-between border-t border-line pt-2 font-semibold">
              <dt>{{ $t('invoice.balanceDue') }}</dt>
              <dd class="num">{{ f.money(inv.balance_due) }}</dd>
            </div>
          </dl>
        </UiCard>
        <UiCard :title="$t('invoice.payments')" :padded="false">
          <p v-if="!inv.payments.length" class="px-5 py-8 text-center text-[13px] text-muted">
            {{ $t('admin.invoice.noPayments') }}
          </p>
          <ul v-else class="divide-y divide-line">
            <li v-for="p in inv.payments" :key="p.id" class="px-5 py-3">
              <div class="flex items-center justify-between gap-3">
                <span class="text-[13px] font-medium">{{
                  p.method === 'credit' ? $t('invoice.accountCredit') : p.gateway || $t('invoice.manual')
                }}</span>
                <UiMoney :value="p.amount" class="text-[13px] font-medium" />
              </div>
              <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                <UiStatus kind="payment" :value="p.status" />
                <UiTime :value="p.created_at" mode="datetime" />
                <span v-if="p.reference" class="font-mono">{{ p.reference }}</span>
                <button
                  v-if="p.status === 'pending' && session.can('invoices.write')"
                  class="ml-auto text-danger hover:underline"
                  @click="voidTarget = p.id"
                >
                  {{ $t('admin.invoice.void') }}
                </button>
              </div>
            </li>
          </ul>
        </UiCard>
      </div>

      <UiDialog
        v-model:open="payOpen"
        :title="$t('admin.invoice.recordPayment')"
        :description="$t('admin.invoice.recordPaymentHint')"
      >
        <form
          id="pay-form"
          class="grid gap-4 sm:grid-cols-2"
          @submit.prevent="
            payMinor &&
            addPayment.mutate({
              params: { id },
              body: {
                amount_minor: payMinor,
                method: pay.method,
                reference: pay.reference.trim(),
                received_at: new Date(pay.received + 'T00:00:00Z').toISOString(),
              },
            })
          "
        >
          <UiField :label="$t('invoice.amount')"
            ><template #default="{ id: fid }"
              ><UiInput :id="fid" v-model="pay.amount" inputmode="decimal"
                ><template #prefix
                  ><span class="text-xs">{{ inv.total.currency }}</span></template
                ></UiInput
              ></template
            ></UiField
          >
          <UiField :label="$t('admin.invoice.method')"
            ><template #default="{ id: fid }"
              ><UiSelect
                :id="fid"
                v-model="pay.method"
                :options="
                  (['bank_transfer', 'cash', 'other'] as const).map((m) => ({
                    value: m,
                    label: $t(`admin.invoice.methods.${m}`),
                  }))
                " /></template
          ></UiField>
          <UiField :label="$t('invoice.reference')"
            ><template #default="{ id: fid }"><UiInput :id="fid" v-model="pay.reference" /></template
          ></UiField>
          <UiField :label="$t('admin.invoice.receivedAt')"
            ><template #default="{ id: fid }"
              ><UiInput :id="fid" v-model="pay.received" type="date" /></template
          ></UiField>
          <p v-if="addPayment.error.value" class="text-[13px] text-danger sm:col-span-2">
            {{ errors.text(addPayment.error.value) }}
          </p>
        </form>
        <template #footer>
          <UiButton variant="ghost" @click="payOpen = false">{{ $t('common.cancel') }}</UiButton>
          <UiButton
            type="submit"
            form="pay-form"
            variant="primary"
            :loading="addPayment.isPending.value"
            :disabled="!payMinor || !pay.reference.trim() || addPayment.uncertain.value"
            >{{ $t('common.confirm') }}</UiButton
          >
        </template>
      </UiDialog>

      <UiDialog v-model:open="refundOpen" :title="$t('admin.invoice.refund')">
        <form
          id="refund-form"
          class="flex flex-col gap-4"
          @submit.prevent="
            refundMinor &&
            doRefund.mutate({
              params: { id },
              body: {
                payment_id: refund.payment_id,
                amount_minor: refundMinor,
                destination: refund.destination,
                reason: refund.reason.trim(),
              },
            })
          "
        >
          <UiField :label="$t('admin.invoice.payment')"
            ><template #default="{ id: fid }"
              ><UiSelect
                :id="fid"
                v-model="refund.payment_id"
                :options="
                  refundable.map((p) => ({
                    value: p.id,
                    label: `${p.gateway || p.method} · ${f.money(p.amount)}`,
                  }))
                " /></template
          ></UiField>
          <UiField :label="$t('invoice.amount')"
            ><template #default="{ id: fid }"
              ><UiInput :id="fid" v-model="refund.amount" inputmode="decimal" /></template
          ></UiField>
          <UiSegmented
            v-model="refund.destination"
            :options="[
              { value: 'credit', label: $t('admin.invoice.toCredit') },
              { value: 'original', label: $t('admin.invoice.toOriginal') },
            ]"
          />
          <UiField :label="$t('admin.reason')"
            ><template #default="{ id: fid }"
              ><UiTextarea :id="fid" v-model="refund.reason" :rows="2" /></template
          ></UiField>
          <p v-if="doRefund.error.value" class="text-[13px] text-danger">
            {{ errors.text(doRefund.error.value) }}
          </p>
        </form>
        <template #footer>
          <UiButton variant="ghost" @click="refundOpen = false">{{ $t('common.cancel') }}</UiButton>
          <UiButton
            type="submit"
            form="refund-form"
            variant="danger"
            :loading="doRefund.isPending.value"
            :disabled="
              !refund.payment_id ||
              !refundMinor ||
              refund.reason.trim().length < 3 ||
              doRefund.uncertain.value
            "
            >{{ $t('admin.invoice.refund') }}</UiButton
          >
        </template>
      </UiDialog>

      <ReasonDialog
        v-model:open="cancelOpen"
        :title="$t('admin.invoice.cancel')"
        :confirm-label="$t('admin.invoice.cancel')"
        tone="danger"
        :loading="cancel.isPending.value"
        :error="cancel.error.value ? errors.text(cancel.error.value) : null"
        @confirm="(reason) => cancel.mutate({ params: { id }, body: { reason } }, { onError: fail })"
      />
      <ReasonDialog
        v-model:open="voidOpen"
        :title="$t('admin.invoice.void')"
        :body="$t('admin.invoice.voidBody')"
        :confirm-label="$t('admin.invoice.void')"
        tone="danger"
        :loading="voidAttempt.isPending.value"
        :error="voidAttempt.error.value ? errors.text(voidAttempt.error.value) : null"
        @confirm="
          (reason) =>
            voidTarget && voidAttempt.mutate({ params: { id, payment_id: voidTarget }, body: { reason } })
        "
      />
    </template>
  </div>
</template>
