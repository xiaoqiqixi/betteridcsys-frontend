<script setup lang="ts">
import { KeyRound, LogOut, Wallet } from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { api } from '@/contract'
import { useApiList, useApiMutation, useApiQuery } from '@/shared/api/query'
import { confirm } from '@/shared/composables/confirm'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import { useToast } from '@/shared/composables/toast'
import { countryName } from '@/shared/lib/countries'
import { parseDecimal } from '@/shared/lib/money'
import { useSession } from '@/shared/stores/session'
import UiBadge from '@/shared/ui/UiBadge.vue'
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
import UiTable from '@/shared/ui/UiTable.vue'
import UiTextarea from '@/shared/ui/UiTextarea.vue'
import UiTime from '@/shared/ui/UiTime.vue'

const route = useRoute()
const { t, locale } = useI18n()
const f = useFormat()
const toast = useToast()
const errors = useErrorText()
const session = useSession()
const id = computed(() => String(route.params.id))
const client = useApiQuery(api.admin.client, () => ({ params: { id: id.value } }))
const c = computed(() => client.data.value)
const tab = ref<'services' | 'invoices' | 'credit'>('services')
const services = useApiList(api.admin.services, () => ({ query: { client_id: id.value, limit: 25 } }))
const invoices = useApiList(api.admin.invoices, () => ({ query: { client_id: id.value, limit: 25 } }))
const ledger = useApiList(api.admin.clientCredit, () => ({ params: { id: id.value }, query: { limit: 25 } }))

const edit = reactive({
  name: '',
  company: '',
  phone: '',
  status: 'active' as 'active' | 'disabled' | 'closed',
  notes: '',
})
watch(
  c,
  (v) =>
    v &&
    Object.assign(edit, {
      name: v.name,
      company: v.company,
      phone: v.phone,
      status: v.status,
      notes: v.notes,
    }),
  { immediate: true },
)
const fail = (e: unknown) => toast.error(errors.text(e))
const save = useApiMutation(api.admin.updateClient, {
  invalidates: [api.admin.client, api.admin.clients],
  onSuccess: () => toast.success(t('common.saved')),
})
const reset = useApiMutation(api.admin.sendPasswordReset, {
  onSuccess: () => toast.success(t('admin.client.resetSent')),
})
const revoke = useApiMutation(api.admin.revokeClientSessions, {
  onSuccess: () => toast.success(t('admin.client.sessionsRevoked')),
})

const creditOpen = ref(false)
const credit = reactive({ direction: 'add' as 'add' | 'remove', amount: '', reason: '' })
const creditMinor = computed(() =>
  c.value ? parseDecimal(credit.amount, c.value.credit.decimal_places) : null,
)
const adjust = useApiMutation(api.admin.adjustCredit, {
  invalidates: [api.admin.client, api.admin.clientCredit],
  onSuccess: () => {
    creditOpen.value = false
    Object.assign(credit, { direction: 'add', amount: '', reason: '' })
    toast.success(t('admin.client.creditAdjusted'))
  },
})
function submitCredit() {
  if (!creditMinor.value) return
  adjust.mutate({
    params: { id: id.value },
    body: {
      amount_minor: credit.direction === 'add' ? creditMinor.value : -creditMinor.value,
      reason: credit.reason.trim(),
    },
  })
}
async function doRevoke() {
  if (
    await confirm({
      title: t('admin.client.revokeTitle'),
      body: t('admin.client.revokeBody'),
      tone: 'danger',
      confirmLabel: t('account.revoke'),
    })
  )
    revoke.mutate({ params: { id: id.value }, body: {} }, { onError: fail })
}
const svcCols = computed(() => [
  { key: 'name', label: t('portal.col.service') },
  { key: 'status', label: t('common.status') },
  { key: 'price', label: t('portal.col.price'), align: 'right' as const, hideBelow: 'sm' as const },
  { key: 'due', label: t('portal.col.nextDue'), align: 'right' as const, hideBelow: 'md' as const },
])
const invCols = computed(() => [
  { key: 'number', label: t('invoice.number') },
  { key: 'status', label: t('common.status') },
  { key: 'total', label: t('invoice.total'), align: 'right' as const },
  { key: 'due', label: t('invoice.due'), align: 'right' as const, hideBelow: 'sm' as const },
])
const ledgerCols = computed(() => [
  { key: 'desc', label: t('invoice.description') },
  { key: 'amount', label: t('invoice.amount'), align: 'right' as const },
  { key: 'balance', label: t('billing.balanceAfter'), align: 'right' as const, hideBelow: 'sm' as const },
  { key: 'at', label: t('common.created'), align: 'right' as const, hideBelow: 'md' as const },
])
</script>

<template>
  <div>
    <UiErrorState v-if="client.isError.value" :error="client.error.value" @retry="client.refetch()" />
    <UiSkeleton v-else-if="!c" :lines="8" />
    <template v-else>
      <UiPageHeader :title="c.name || c.email" back="/admin/clients" :back-label="$t('admin.nav.clients')">
        <template #badges>
          <UiStatus kind="client" :value="c.status" />
          <UiBadge v-if="!c.email_verified" tone="warning">{{ $t('admin.client.unverified') }}</UiBadge>
        </template>
        <template #meta
          ><p class="mt-1 text-[13px] text-muted">
            {{ c.email }} · {{ countryName(c.country, locale) }} · {{ c.currency }} ·
            {{ $t('common.created') }} <UiTime :value="c.created_at" /></p
        ></template>
        <template #actions>
          <UiButton v-if="session.can('clients.credit')" @click="creditOpen = true"
            ><Wallet class="size-4" />{{ $t('admin.client.adjustCredit') }}</UiButton
          >
          <UiButton
            :loading="reset.isPending.value"
            @click="reset.mutate({ params: { id }, body: {} }, { onError: fail })"
            ><KeyRound class="size-4" />{{ $t('admin.client.sendReset') }}</UiButton
          >
          <UiButton variant="danger-ghost" :loading="revoke.isPending.value" @click="doRevoke"
            ><LogOut class="size-4" />{{ $t('admin.client.revokeSessions') }}</UiButton
          >
        </template>
      </UiPageHeader>

      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div class="rounded-lg border border-line bg-surface p-4">
          <p class="text-xs text-muted">{{ $t('nav.credit') }}</p>
          <UiMoney :value="c.credit" class="mt-1 block text-lg font-semibold" />
        </div>
        <div class="rounded-lg border border-line bg-surface p-4">
          <p class="text-xs text-muted">{{ $t('admin.client.outstanding') }}</p>
          <UiMoney :value="c.outstanding" class="mt-1 block text-lg font-semibold" />
        </div>
        <div class="rounded-lg border border-line bg-surface p-4">
          <p class="text-xs text-muted">{{ $t('admin.client.lifetime') }}</p>
          <UiMoney :value="c.lifetime_paid" class="mt-1 block text-lg font-semibold" />
        </div>
        <div class="rounded-lg border border-line bg-surface p-4">
          <p class="text-xs text-muted">{{ $t('admin.client.lastLogin') }}</p>
          <p class="mt-1 text-lg font-semibold"><UiTime :value="c.last_login_at" mode="relative" /></p>
        </div>
      </div>

      <div class="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div class="min-w-0">
          <div class="mb-3">
            <UiSegmented
              v-model="tab"
              :options="[
                { value: 'services', label: $t('nav.services') },
                { value: 'invoices', label: $t('nav.invoices') },
                { value: 'credit', label: $t('billing.history') },
              ]"
            />
          </div>
          <div class="rounded-lg border border-line bg-surface shadow-xs">
            <UiTable
              v-if="tab === 'services'"
              :columns="svcCols"
              :rows="services.items.value"
              :row-key="(r) => r.id"
              :to="(r) => ({ name: 'admin-service', params: { id: r.id } })"
              :loading="services.isPending.value"
            >
              <template #cell-name="{ row }"
                ><p class="font-medium">{{ row.label || row.hostname || row.product_name }}</p>
                <p class="text-xs text-muted">{{ row.product_name }} · {{ row.region }}</p></template
              >
              <template #cell-status="{ row }"><UiStatus kind="service" :value="row.status" /></template>
              <template #cell-price="{ row }"><UiMoney :value="row.recurring" /></template>
              <template #cell-due="{ row }"><UiTime :value="row.next_due_at" /></template>
              <template #empty
                ><p class="px-5 py-8 text-center text-[13px] text-muted">
                  {{ $t('portal.noServices') }}
                </p></template
              >
            </UiTable>
            <UiTable
              v-else-if="tab === 'invoices'"
              :columns="invCols"
              :rows="invoices.items.value"
              :row-key="(r) => r.id"
              :to="(r) => ({ name: 'admin-invoice', params: { id: r.id } })"
              :loading="invoices.isPending.value"
            >
              <template #cell-number="{ row }"
                ><span class="font-mono text-[13px]">#{{ row.number }}</span></template
              >
              <template #cell-status="{ row }"><UiStatus kind="invoice" :value="row.status" /></template>
              <template #cell-total="{ row }"><UiMoney :value="row.total" /></template>
              <template #cell-due="{ row }"><UiTime :value="row.due_at" /></template>
              <template #empty
                ><p class="px-5 py-8 text-center text-[13px] text-muted">
                  {{ $t('invoice.empty') }}
                </p></template
              >
            </UiTable>
            <UiTable
              v-else
              :columns="ledgerCols"
              :rows="ledger.items.value"
              :row-key="(r) => r.id"
              :loading="ledger.isPending.value"
            >
              <template #cell-desc="{ row }"
                ><p class="font-medium">{{ $t(`billing.kind.${row.kind}`) }}</p>
                <p class="text-xs text-muted">{{ row.description }}</p></template
              >
              <template #cell-amount="{ row }"><UiMoney :value="row.amount" signed /></template>
              <template #cell-balance="{ row }"
                ><UiMoney :value="row.balance_after" class="text-muted"
              /></template>
              <template #cell-at="{ row }"><UiTime :value="row.created_at" mode="datetime" /></template>
              <template #empty
                ><p class="px-5 py-8 text-center text-[13px] text-muted">
                  {{ $t('billing.empty') }}
                </p></template
              >
            </UiTable>
          </div>
        </div>

        <UiCard :title="$t('admin.client.profile')">
          <form
            class="flex flex-col gap-4"
            @submit.prevent="
              save.mutate({ params: { id }, body: { revision: c.revision, ...edit } }, { onError: fail })
            "
          >
            <UiField :label="$t('auth.name')"
              ><template #default="{ id: fid }"><UiInput :id="fid" v-model="edit.name" size="sm" /></template
            ></UiField>
            <UiField :label="$t('account.company')"
              ><template #default="{ id: fid }"
                ><UiInput :id="fid" v-model="edit.company" size="sm" /></template
            ></UiField>
            <UiField :label="$t('account.phone')"
              ><template #default="{ id: fid }"><UiInput :id="fid" v-model="edit.phone" size="sm" /></template
            ></UiField>
            <UiField :label="$t('common.status')">
              <template #default="{ id: fid }"
                ><UiSelect
                  :id="fid"
                  v-model="edit.status"
                  size="sm"
                  :options="
                    (['active', 'disabled', 'closed'] as const).map((v) => ({
                      value: v,
                      label: $t(`status.client.${v}`),
                    }))
                  "
              /></template>
            </UiField>
            <UiField :label="$t('admin.client.notes')" :hint="$t('admin.client.notesHint')"
              ><template #default="{ id: fid }"
                ><UiTextarea :id="fid" v-model="edit.notes" :rows="4" /></template
            ></UiField>
            <p class="text-xs text-muted">{{ c.address }}</p>
            <UiButton type="submit" variant="primary" :loading="save.isPending.value">{{
              $t('common.save')
            }}</UiButton>
          </form>
        </UiCard>
      </div>

      <UiDialog
        v-model:open="creditOpen"
        :title="$t('admin.client.adjustCredit')"
        :description="$t('admin.client.currentCredit', { amount: f.money(c.credit) })"
      >
        <form id="credit-form" class="flex flex-col gap-4" @submit.prevent="submitCredit">
          <UiSegmented
            v-model="credit.direction"
            :options="[
              { value: 'add', label: $t('admin.client.addCredit') },
              { value: 'remove', label: $t('admin.client.removeCredit') },
            ]"
          />
          <UiField :label="$t('invoice.amount')"
            ><template #default="{ id: fid }"
              ><UiInput :id="fid" v-model="credit.amount" inputmode="decimal"
                ><template #prefix
                  ><span class="text-xs">{{ c.credit.currency }}</span></template
                ></UiInput
              ></template
            ></UiField
          >
          <UiField :label="$t('admin.reason')" :hint="$t('admin.reasonHint')"
            ><template #default="{ id: fid }"
              ><UiTextarea :id="fid" v-model="credit.reason" :rows="2" /></template
          ></UiField>
          <p v-if="adjust.error.value" class="text-[13px] text-danger">
            {{ errors.text(adjust.error.value) }}
          </p>
        </form>
        <template #footer>
          <UiButton variant="ghost" @click="creditOpen = false">{{ $t('common.cancel') }}</UiButton>
          <UiButton
            type="submit"
            form="credit-form"
            variant="primary"
            :loading="adjust.isPending.value"
            :disabled="!creditMinor || credit.reason.trim().length < 3 || adjust.uncertain.value"
            >{{ $t('common.confirm') }}</UiButton
          >
        </template>
      </UiDialog>
    </template>
  </div>
</template>
