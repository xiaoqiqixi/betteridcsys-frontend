<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract/admin-endpoints'
import { AffiliatePatch } from '@/contract/affiliate'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useToast } from '@/shared/composables/toast'
import { minorToDecimal, parseDecimal } from '@/shared/lib/money'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiMoney from '@/shared/ui/UiMoney.vue'
import UiSelect from '@/shared/ui/UiSelect.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiSwitch from '@/shared/ui/UiSwitch.vue'
import UiTextarea from '@/shared/ui/UiTextarea.vue'
const { id } = defineProps<{ id: string }>()
const { t } = useI18n()
const errors = useErrorText()
const toast = useToast()
const detail = useApiQuery(api.admin.affiliate, () => ({ params: { id } }))
const percent = ref('')
const suspended = ref(false)
const note = ref('')
const loaded = ref(false)
function reset() {
  const d = detail.data.value
  if (!d) return
  percent.value = d.rate_bp === null ? '' : minorToDecimal(d.rate_bp, 2)
  suspended.value = d.status === 'suspended'
  note.value = d.note
  loaded.value = true
}
watch(
  detail.data,
  () => {
    if (!loaded.value) reset()
  },
  { immediate: true },
)
const patch = computed(() =>
  AffiliatePatch.safeParse({
    rate_bp: percent.value.trim() === '' ? null : parseDecimal(percent.value, 2),
    status: suspended.value ? 'suspended' : 'active',
    note: note.value,
  }),
)
const invalidRate = computed(() => percent.value.trim() !== '' && parseDecimal(percent.value, 2) === null)
const save = useApiMutation(api.admin.updateAffiliate, {
  invalidates: [api.admin.affiliates, api.admin.affiliate],
  onSuccess: () => {
    reset()
    toast.success(t('common.saved'))
  },
})
const currency = ref('')
const amount = ref('')
const reference = ref('')
const balance = computed(() => detail.data.value?.balances.find((b) => b.currency === currency.value))
const minor = computed(() =>
  balance.value ? parseDecimal(amount.value, balance.value.available.decimal_places) : null,
)
const payout = useApiMutation(api.admin.affiliatePayout, {
  invalidates: [api.admin.affiliates, api.admin.affiliate],
  onSuccess: () => {
    amount.value = ''
    reference.value = ''
    toast.success(t('affAdmin.paid'))
  },
})
function submit() {
  if (patch.value.success && !invalidRate.value) save.mutate({ params: { id }, body: patch.value.data })
}
function pay() {
  if (
    minor.value &&
    balance.value &&
    minor.value <= balance.value.available.amount_minor &&
    reference.value.trim()
  )
    payout.mutate({
      params: { id },
      body: { currency: currency.value, amount_minor: minor.value, reference: reference.value.trim() },
    })
}
</script>
<template>
  <UiErrorState v-if="detail.isError.value" :error="detail.error.value" @retry="detail.refetch()" />
  <UiSkeleton v-else-if="!detail.data.value" :lines="5" />
  <div v-else class="space-y-5 p-4">
    <div>
      <h3 class="font-medium break-words">{{ detail.data.value.name }}</h3>
      <p class="text-sm break-all text-muted">{{ detail.data.value.email }}</p>
    </div>
    <form class="space-y-4" @submit.prevent="submit">
      <UiField :label="$t('affAdmin.rate')" :hint="$t('affAdmin.overrideHint')"
        ><template #default="{ id: fieldId }"
          ><UiInput :id="fieldId" v-model="percent" inputmode="decimal"
            ><template #suffix>%</template></UiInput
          ></template
        ></UiField
      >
      <UiSwitch v-model="suspended" :label="$t('affAdmin.suspend')" />
      <UiField :label="$t('affAdmin.note')"
        ><template #default="{ id: fieldId }"
          ><UiTextarea :id="fieldId" v-model="note" maxlength="2000" /></template
      ></UiField>
      <p v-if="save.error.value" class="text-sm text-danger" role="alert">
        {{ errors.text(save.error.value) }}
      </p>
      <UiButton
        type="submit"
        variant="primary"
        :loading="save.isPending.value"
        :disabled="!patch.success || invalidRate"
        >{{ $t('common.save') }}</UiButton
      >
    </form>
    <UiCard v-for="b in detail.data.value.balances" :key="b.currency" :title="b.currency">
      <dl class="space-y-2 text-sm">
        <div
          v-for="k in ['pending', 'available', 'paid_out', 'debt'] as const"
          :key="k"
          class="flex flex-wrap justify-between gap-2"
        >
          <dt>{{ $t(`affAdmin.balance.${k}`) }}</dt>
          <dd><UiMoney :value="b[k]" /></dd>
        </div>
      </dl>
    </UiCard>
    <form class="space-y-4 border-t border-line pt-5" @submit.prevent="pay">
      <h3 class="font-medium">{{ $t('affAdmin.payout') }}</h3>
      <p class="text-xs text-muted">{{ $t('affAdmin.payoutHint') }}</p>
      <fieldset :disabled="payout.isPending.value || payout.uncertain.value" class="space-y-4">
        <UiField :label="$t('auth.currency')"
          ><template #default="{ id: fieldId }"
            ><UiSelect
              :id="fieldId"
              v-model="currency"
              :disabled="payout.isPending.value || payout.uncertain.value"
              :options="
                detail.data.value.balances.map((b) => ({
                  value: b.currency,
                  label: b.currency,
                  disabled: b.available.amount_minor <= 0,
                }))
              " /></template
        ></UiField>
        <UiField :label="$t('affAdmin.amount')"
          ><template #default="{ id: fieldId }"
            ><UiInput :id="fieldId" v-model="amount" inputmode="decimal" required /></template
        ></UiField>
        <UiField :label="$t('affAdmin.reference')"
          ><template #default="{ id: fieldId }"
            ><UiInput :id="fieldId" v-model="reference" maxlength="120" required /></template
        ></UiField>
      </fieldset>
      <p v-if="payout.error.value" class="text-sm text-danger" role="alert">
        {{ errors.text(payout.error.value) }}
      </p>
      <UiButton
        type="submit"
        :loading="payout.isPending.value"
        :disabled="!minor || !balance || minor > balance.available.amount_minor || !reference.trim()"
        >{{ payout.uncertain.value ? $t('common.retry') : $t('affAdmin.payout') }}</UiButton
      >
    </form>
  </div>
</template>
