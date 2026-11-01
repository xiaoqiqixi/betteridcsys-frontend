<script setup lang="ts">
import { Plus, TicketPercent } from '@lucide/vue'
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { z } from 'zod'
import { api, type BillingCycle } from '@/contract'
import type { Coupon, CouponUpsert } from '@/contract/admin'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import { useToast } from '@/shared/composables/toast'
import { parseDecimal } from '@/shared/lib/money'
import { useSession } from '@/shared/stores/session'
import UiBadge from '@/shared/ui/UiBadge.vue'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCheckbox from '@/shared/ui/UiCheckbox.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'
import UiEmpty from '@/shared/ui/UiEmpty.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSegmented from '@/shared/ui/UiSegmented.vue'
import UiSwitch from '@/shared/ui/UiSwitch.vue'
import UiTable from '@/shared/ui/UiTable.vue'
import UiTime from '@/shared/ui/UiTime.vue'

type Upsert = z.input<typeof CouponUpsert>
const { t } = useI18n()
const f = useFormat()
const toast = useToast()
const errors = useErrorText()
const session = useSession()
const coupons = useApiQuery(api.admin.coupons)
const products = useApiQuery(api.admin.products)
const currencies = useApiQuery(api.admin.currencies)
const editing = ref<Coupon | null>(null)
const open = ref(false)
const CYCLES: BillingCycle[] = [
  'monthly',
  'quarterly',
  'semiannually',
  'annually',
  'biennially',
  'triennially',
]
const form = reactive({
  code: '',
  kind: 'percent' as 'percent' | 'fixed',
  percent: '10',
  fixed: {} as Record<string, string>,
  product_ids: [] as string[],
  cycles: [] as BillingCycle[],
  recurring: false,
  new_clients_only: false,
  max_uses: '',
  max_uses_per_client: '1',
  starts: '',
  ends: '',
  active: true,
})
function openEditor(c?: Coupon) {
  editing.value = c ?? null
  Object.assign(
    form,
    c
      ? {
          code: c.code,
          kind: c.kind,
          percent: c.percent_bp ? String(c.percent_bp / 100) : '',
          fixed: Object.fromEntries(
            c.fixed.map((x) => [
              x.currency,
              String(
                x.amount_minor /
                  10 **
                    (currencies.data.value?.currencies.find((cc) => cc.code === x.currency)?.decimal_places ??
                      2),
              ),
            ]),
          ),
          product_ids: [...c.applies_to.product_ids],
          cycles: [...c.applies_to.cycles],
          recurring: c.recurring,
          new_clients_only: c.new_clients_only,
          max_uses: c.max_uses?.toString() ?? '',
          max_uses_per_client: c.max_uses_per_client?.toString() ?? '',
          starts: c.starts_at?.slice(0, 10) ?? '',
          ends: c.ends_at?.slice(0, 10) ?? '',
          active: c.active,
        }
      : {
          code: '',
          kind: 'percent',
          percent: '10',
          fixed: {},
          product_ids: [],
          cycles: [],
          recurring: false,
          new_clients_only: false,
          max_uses: '',
          max_uses_per_client: '1',
          starts: '',
          ends: '',
          active: true,
        },
  )
  open.value = true
}
const body = computed<Upsert | null>(() => {
  const bp = Math.round(Number(form.percent) * 100)
  const fixed = Object.entries(form.fixed)
    .filter(([, v]) => v.trim())
    .map(([currency, v]) => ({
      currency,
      amount_minor:
        parseDecimal(
          v,
          currencies.data.value?.currencies.find((c) => c.code === currency)?.decimal_places ?? 2,
        ) ?? -1,
    }))
  if (form.kind === 'percent' && !(bp >= 1 && bp <= 10000)) return null
  if (form.kind === 'fixed' && (!fixed.length || fixed.some((x) => x.amount_minor < 1))) return null
  if (!/^[A-Z0-9-]{3,32}$/.test(form.code)) return null
  return {
    ...(editing.value ? { revision: editing.value.revision } : {}),
    code: form.code,
    kind: form.kind,
    percent_bp: form.kind === 'percent' ? bp : null,
    fixed: form.kind === 'fixed' ? fixed : [],
    applies_to: { product_ids: form.product_ids, cycles: form.cycles },
    recurring: form.recurring,
    new_clients_only: form.new_clients_only,
    max_uses: form.max_uses ? Number(form.max_uses) : null,
    max_uses_per_client: form.max_uses_per_client ? Number(form.max_uses_per_client) : null,
    starts_at: form.starts ? new Date(form.starts + 'T00:00:00Z').toISOString() : null,
    ends_at: form.ends ? new Date(form.ends + 'T23:59:59Z').toISOString() : null,
    active: form.active,
  }
})
const opts = {
  invalidates: [api.admin.coupons],
  onSuccess: () => {
    open.value = false
    toast.success(t('common.saved'))
  },
}
const create = useApiMutation(api.admin.createCoupon, opts)
const update = useApiMutation(api.admin.updateCoupon, opts)
function save() {
  if (!body.value) return
  if (editing.value) update.mutate({ params: { id: editing.value.id }, body: body.value })
  else create.mutate({ body: body.value })
}
const saveError = computed(() => create.error.value ?? update.error.value)
const columns = computed(() => [
  { key: 'code', label: t('admin.coupon.code') },
  { key: 'value', label: t('admin.coupon.value') },
  { key: 'usage', label: t('admin.coupon.usage'), hideBelow: 'sm' as const },
  { key: 'window', label: t('admin.coupon.window'), hideBelow: 'md' as const },
  { key: 'status', label: t('common.status'), align: 'right' as const },
])
</script>

<template>
  <div>
    <UiPageHeader :title="$t('admin.nav.coupons')" :description="$t('admin.coupon.subtitle')">
      <template #actions
        ><UiButton v-if="session.can('promotions.write')" variant="primary" @click="openEditor()"
          ><Plus class="size-4" />{{ $t('admin.coupon.create') }}</UiButton
        ></template
      >
    </UiPageHeader>
    <div class="rounded-lg border border-line bg-surface shadow-xs">
      <UiErrorState v-if="coupons.isError.value" :error="coupons.error.value" @retry="coupons.refetch()" />
      <UiTable
        v-else
        :columns="columns"
        :rows="coupons.data.value ?? []"
        :row-key="(r) => r.id"
        :loading="coupons.isPending.value"
      >
        <template #cell-code="{ row }"
          ><button
            class="font-mono text-[13px] font-semibold hover:text-primary"
            @click="session.can('promotions.write') && openEditor(row)"
          >
            {{ row.code }}
          </button></template
        >
        <template #cell-value="{ row }">
          <span v-if="row.kind === 'percent'">{{ (row.percent_bp ?? 0) / 100 }}%</span>
          <span v-else class="num">{{
            row.fixed
              .map((x) =>
                f.money({
                  currency: x.currency,
                  amount_minor: x.amount_minor,
                  decimal_places:
                    currencies.data.value?.currencies.find((c) => c.code === x.currency)?.decimal_places ?? 2,
                }),
              )
              .join(' / ')
          }}</span>
          <UiBadge v-if="row.recurring" class="ml-2">{{ $t('admin.coupon.recurring') }}</UiBadge>
        </template>
        <template #cell-usage="{ row }"
          ><span class="num text-muted"
            >{{ row.used }}{{ row.max_uses ? ` / ${row.max_uses}` : '' }}</span
          ></template
        >
        <template #cell-window="{ row }"
          ><span class="text-xs text-muted"
            ><UiTime :value="row.starts_at" /> → <UiTime :value="row.ends_at" /></span
        ></template>
        <template #cell-status="{ row }"
          ><UiBadge :tone="row.active ? 'success' : 'neutral'" dot>{{
            row.active ? $t('admin.coupon.active') : $t('admin.coupon.inactive')
          }}</UiBadge></template
        >
        <template #empty><UiEmpty :icon="TicketPercent" :title="$t('admin.coupon.empty')" /></template>
      </UiTable>
    </div>

    <UiDialog v-model:open="open" :title="editing ? editing.code : $t('admin.coupon.create')" size="lg">
      <form id="coupon-form" class="flex flex-col gap-5" @submit.prevent="save">
        <div class="grid gap-4 sm:grid-cols-2">
          <UiField :label="$t('admin.coupon.code')" :hint="$t('admin.coupon.codeHint')"
            ><template #default="{ id }"
              ><UiInput
                :id="id"
                :model-value="form.code"
                mono
                @update:model-value="(v) => (form.code = String(v ?? '').toUpperCase())" /></template
          ></UiField>
          <UiField :label="$t('admin.coupon.type')"
            ><template #default
              ><UiSegmented
                v-model="form.kind"
                :options="[
                  { value: 'percent', label: $t('admin.coupon.percent') },
                  { value: 'fixed', label: $t('admin.coupon.fixed') },
                ]" /></template
          ></UiField>
        </div>
        <UiField v-if="form.kind === 'percent'" :label="$t('admin.coupon.percentValue')"
          ><template #default="{ id }"
            ><UiInput :id="id" v-model="form.percent" inputmode="decimal" class="max-w-32"
              ><template #suffix>%</template></UiInput
            ></template
          ></UiField
        >
        <div v-else class="grid gap-3 sm:grid-cols-3">
          <UiField v-for="c in currencies.data.value?.currencies ?? []" :key="c.code" :label="c.code"
            ><template #default="{ id }"
              ><UiInput :id="id" v-model="form.fixed[c.code]" inputmode="decimal" /></template
          ></UiField>
        </div>
        <div>
          <p class="mb-2 text-[13px] font-medium text-fg-2">
            {{ $t('admin.coupon.products') }}
            <span class="font-normal text-faint">({{ $t('admin.coupon.emptyAll') }})</span>
          </p>
          <div class="grid max-h-40 gap-1.5 overflow-y-auto sm:grid-cols-2">
            <UiCheckbox
              v-for="p in products.data.value ?? []"
              :key="p.id"
              :model-value="form.product_ids.includes(p.id)"
              :label="f.text(p.name)"
              @update:model-value="
                (v: boolean) =>
                  (form.product_ids = v
                    ? [...form.product_ids, p.id]
                    : form.product_ids.filter((x) => x !== p.id))
              "
            />
          </div>
        </div>
        <div>
          <p class="mb-2 text-[13px] font-medium text-fg-2">
            {{ $t('admin.coupon.cycles') }}
            <span class="font-normal text-faint">({{ $t('admin.coupon.emptyAll') }})</span>
          </p>
          <div class="flex flex-wrap gap-3">
            <UiCheckbox
              v-for="c in CYCLES"
              :key="c"
              :model-value="form.cycles.includes(c)"
              :label="f.cycle(c)"
              @update:model-value="
                (v: boolean) => (form.cycles = v ? [...form.cycles, c] : form.cycles.filter((x) => x !== c))
              "
            />
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <UiField :label="$t('admin.coupon.maxUses')" optional
            ><template #default="{ id }"
              ><UiInput :id="id" v-model="form.max_uses" type="number" min="1" /></template
          ></UiField>
          <UiField :label="$t('admin.coupon.perClient')" optional
            ><template #default="{ id }"
              ><UiInput :id="id" v-model="form.max_uses_per_client" type="number" min="1" /></template
          ></UiField>
          <UiField :label="$t('admin.coupon.starts')" optional
            ><template #default="{ id }"><UiInput :id="id" v-model="form.starts" type="date" /></template
          ></UiField>
          <UiField :label="$t('admin.coupon.ends')" optional
            ><template #default="{ id }"><UiInput :id="id" v-model="form.ends" type="date" /></template
          ></UiField>
        </div>
        <div class="flex flex-col gap-3">
          <UiSwitch
            v-model="form.recurring"
            :label="$t('admin.coupon.recurring')"
            :description="$t('admin.coupon.recurringHint')"
          />
          <UiSwitch v-model="form.new_clients_only" :label="$t('admin.coupon.newOnly')" />
          <UiSwitch v-model="form.active" :label="$t('admin.coupon.active')" />
        </div>
        <p v-if="saveError" class="text-[13px] text-danger">{{ errors.text(saveError) }}</p>
      </form>
      <template #footer>
        <UiButton variant="ghost" @click="open = false">{{ $t('common.cancel') }}</UiButton>
        <UiButton
          type="submit"
          form="coupon-form"
          variant="primary"
          :disabled="!body"
          :loading="create.isPending.value || update.isPending.value"
          >{{ $t('common.save') }}</UiButton
        >
      </template>
    </UiDialog>
  </div>
</template>
