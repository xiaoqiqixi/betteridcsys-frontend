<script setup lang="ts">
import { computed, ref, toRaw, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { AffiliateSettings } from '@/contract/affiliate'
import { api } from '@/contract/admin-endpoints'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useSite } from '@/shared/composables/site'
import { useToast } from '@/shared/composables/toast'
import { minorToDecimal, parseDecimal } from '@/shared/lib/money'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiSelect from '@/shared/ui/UiSelect.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiSwitch from '@/shared/ui/UiSwitch.vue'
import CurrencyRulesEditor from './CurrencyRulesEditor.vue'
import ProductRatesEditor from './ProductRatesEditor.vue'
const { t } = useI18n()
const site = useSite()
const errors = useErrorText()
const toast = useToast()
const query = useApiQuery(api.admin.affiliateSettings)
const form = ref<AffiliateSettings>()
const percent = ref('')
const minimums = ref<{ currency: string; amount: string }[]>([])
const caps = ref<{ currency: string; amount: string }[]>([])
const products = ref<{ product_id: string; percent: string }[]>([])
const precision = (currency: string) =>
  site.currencies.data.value?.currencies.find((c) => c.code === currency)?.decimal_places
function reset(s: AffiliateSettings) {
  form.value = structuredClone(toRaw(s))
  percent.value = minorToDecimal(s.default_rate_bp, 2)
  const rows = (v: AffiliateSettings['min_withdraw']) =>
    v.map((x) => ({
      currency: x.currency,
      amount: minorToDecimal(x.amount_minor, precision(x.currency) ?? 2),
    }))
  minimums.value = rows(s.min_withdraw)
  caps.value = rows(s.max_per_referral)
  products.value = s.product_overrides.map((x) => ({
    product_id: x.product_id,
    percent: minorToDecimal(x.rate_bp, 2),
  }))
}
watch(
  [query.data, site.currencies.data],
  ([s, currencies]) => {
    if (s && currencies && !form.value) reset(s)
  },
  { immediate: true },
)
const draft = computed(() => {
  const amounts = (rows: typeof minimums.value) =>
    rows.map((x) => ({
      currency: x.currency,
      amount_minor:
        precision(x.currency) === undefined ? null : parseDecimal(x.amount, precision(x.currency)!),
    }))
  return AffiliateSettings.safeParse({
    ...form.value,
    default_rate_bp: parseDecimal(percent.value, 2),
    min_withdraw: amounts(minimums.value),
    max_per_referral: amounts(caps.value),
    product_overrides: products.value.map((p) => ({
      product_id: p.product_id,
      rate_bp: parseDecimal(p.percent, 2),
    })),
  })
})
const duplicates = computed(() =>
  [
    minimums.value.map((x) => x.currency),
    caps.value.map((x) => x.currency),
    products.value.map((x) => x.product_id),
  ].some((ids) => new Set(ids).size !== ids.length),
)
const save = useApiMutation(api.admin.updateAffiliateSettings, {
  invalidates: [api.admin.affiliateSettings, api.affiliate.summary],
  onSuccess: (s) => {
    reset(s)
    toast.success(t('common.saved'))
  },
})
function submit() {
  if (draft.value.success && !duplicates.value) save.mutate({ body: draft.value.data })
}
const scopes = computed(() =>
  (['first_payment', 'all_payments', 'first_months'] as const).map((value) => ({
    value,
    label: t(`affiliate.scope.${value}`, { months: form.value?.scope_months ?? 12 }),
  })),
)
</script>
<template>
  <UiErrorState v-if="query.isError.value" :error="query.error.value" @retry="query.refetch()" />
  <UiErrorState
    v-else-if="site.currencies.isError.value"
    :error="site.currencies.error.value"
    @retry="site.currencies.refetch()"
  />
  <UiSkeleton v-else-if="!form" :lines="8" />
  <form v-else class="space-y-5" @submit.prevent="submit">
    <UiCard :title="$t('affAdmin.settings')" :description="$t('affAdmin.snapshotHint')">
      <UiSwitch
        v-model="form.enabled"
        :label="$t('affAdmin.enabled')"
        :description="$t('affAdmin.enabledHint')"
      />
      <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UiField :label="$t('affAdmin.rate')"
          ><template #default="{ id }"
            ><UiInput :id="id" v-model="percent" inputmode="decimal" required
              ><template #suffix>%</template></UiInput
            ></template
          ></UiField
        >
        <UiField :label="$t('affAdmin.scope')"
          ><template #default="{ id }"><UiSelect :id="id" v-model="form.scope" :options="scopes" /></template
        ></UiField>
        <UiField v-if="form.scope === 'first_months'" :label="$t('affAdmin.months')"
          ><template #default="{ id }"
            ><UiInput
              :id="id"
              v-model.number="form.scope_months"
              type="number"
              min="1"
              max="120"
              required /></template
        ></UiField>
        <UiField :label="$t('affAdmin.hold')"
          ><template #default="{ id }"
            ><UiInput
              :id="id"
              v-model.number="form.hold_days"
              type="number"
              min="0"
              max="365"
              required /></template
        ></UiField>
        <UiField :label="$t('affAdmin.attribution')"
          ><template #default="{ id }"
            ><UiInput
              :id="id"
              v-model.number="form.attribution_days"
              type="number"
              min="1"
              max="365"
              required /></template
        ></UiField>
      </div>
      <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <UiSwitch
          v-model="form.allow_self_referral"
          :label="$t('affAdmin.self')"
          :description="$t('affAdmin.selfHint')"
        />
        <UiSwitch
          :model-value="form.clawback === 'reverse_all'"
          :label="$t('affAdmin.clawback')"
          :description="$t('affAdmin.clawbackHint')"
          @update:model-value="form.clawback = $event ? 'reverse_all' : 'reverse_pending'"
        />
      </div>
    </UiCard>
    <UiCard
      ><div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CurrencyRulesEditor
          v-model="minimums"
          :label="$t('affAdmin.minimums')"
          :hint="$t('affAdmin.minimumHint')"
        />
        <CurrencyRulesEditor
          v-model="caps"
          :label="$t('affAdmin.caps')"
          :hint="$t('affAdmin.capHint')"
        /></div
    ></UiCard>
    <UiCard :title="$t('affAdmin.products')"><ProductRatesEditor v-model="products" /></UiCard>
    <p v-if="!draft.success || duplicates" class="text-sm text-danger" role="alert">
      {{ $t('affAdmin.invalid') }}
    </p>
    <p v-if="save.error.value" class="text-sm text-danger" role="alert">
      {{ errors.text(save.error.value) }}
    </p>
    <div class="flex justify-end gap-3">
      <UiButton
        :disabled="save.isPending.value"
        @click="query.refetch().then((r) => r.data && reset(r.data))"
        >{{ $t('affAdmin.reload') }}</UiButton
      >
      <UiButton
        type="submit"
        variant="primary"
        :loading="save.isPending.value"
        :disabled="!draft.success || duplicates"
        >{{ $t('common.save') }}</UiButton
      >
    </div>
  </form>
</template>
