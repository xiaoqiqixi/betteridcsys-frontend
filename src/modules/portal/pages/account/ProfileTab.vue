<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api, type Locale } from '@/contract/client-endpoints'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useSite } from '@/shared/composables/site'
import { useToast } from '@/shared/composables/toast'
import { COUNTRIES, countryName } from '@/shared/lib/countries'
import { useSession } from '@/shared/stores/session'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiSelect from '@/shared/ui/UiSelect.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'

const { t, locale } = useI18n()
const toast = useToast()
const errors = useErrorText()
const site = useSite()
const session = useSession()
const profile = useApiQuery(api.account.profile)
const form = reactive({
  name: '',
  company: '',
  phone: '',
  country: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  locale: 'zh-CN' as Locale,
  currency: '',
})
watch(
  () => profile.data.value,
  (p) =>
    p &&
    Object.assign(form, {
      name: p.name,
      company: p.company,
      phone: p.phone,
      country: p.country,
      address_line1: p.address_line1,
      address_line2: p.address_line2,
      city: p.city,
      state: p.state,
      postal_code: p.postal_code,
      locale: p.locale,
      currency: p.currency,
    }),
  { immediate: true },
)
const countries = computed(() =>
  COUNTRIES.map((c) => ({ value: c, label: countryName(c, locale.value) })).sort((a, b) =>
    a.label.localeCompare(b.label, locale.value),
  ),
)
const save = useApiMutation(api.account.updateProfile, {
  invalidates: [api.account.profile],
  onSuccess: () => {
    toast.success(t('common.saved'))
    void session.load(true)
  },
})
function submit() {
  const p = profile.data.value
  if (!p) return
  save.mutate({
    body: { revision: p.revision, ...form, ...(p.currency_locked ? { currency: undefined } : {}) },
  })
}
</script>

<template>
  <UiErrorState v-if="profile.isError.value" :error="profile.error.value" @retry="profile.refetch()" />
  <UiSkeleton v-else-if="!profile.data.value" :lines="8" />
  <form v-else class="flex flex-col gap-6" @submit.prevent="submit">
    <UiCard :title="$t('account.profile')" :description="profile.data.value.email">
      <div class="grid gap-4 sm:grid-cols-2">
        <UiField :label="$t('auth.name')"
          ><template #default="{ id }"><UiInput :id="id" v-model="form.name" autocomplete="name" /></template
        ></UiField>
        <UiField :label="$t('account.company')" optional
          ><template #default="{ id }"
            ><UiInput :id="id" v-model="form.company" autocomplete="organization" /></template
        ></UiField>
        <UiField :label="$t('account.phone')" optional
          ><template #default="{ id }"
            ><UiInput :id="id" v-model="form.phone" type="tel" autocomplete="tel" /></template
        ></UiField>
        <UiField :label="$t('account.language')">
          <template #default="{ id }"
            ><UiSelect
              :id="id"
              v-model="form.locale"
              :options="[
                { value: 'zh-CN', label: '简体中文' },
                { value: 'en', label: 'English' },
              ]"
          /></template>
        </UiField>
      </div>
    </UiCard>
    <UiCard :title="$t('account.address')" :description="$t('account.addressHint')">
      <div class="grid gap-4 sm:grid-cols-2">
        <UiField :label="$t('auth.country')" class="sm:col-span-2"
          ><template #default="{ id }"
            ><UiSelect :id="id" v-model="form.country" :options="countries" /></template
        ></UiField>
        <UiField :label="$t('account.address1')" class="sm:col-span-2"
          ><template #default="{ id }"
            ><UiInput :id="id" v-model="form.address_line1" autocomplete="address-line1" /></template
        ></UiField>
        <UiField :label="$t('account.address2')" class="sm:col-span-2" optional
          ><template #default="{ id }"
            ><UiInput :id="id" v-model="form.address_line2" autocomplete="address-line2" /></template
        ></UiField>
        <UiField :label="$t('account.city')"
          ><template #default="{ id }"
            ><UiInput :id="id" v-model="form.city" autocomplete="address-level2" /></template
        ></UiField>
        <UiField :label="$t('account.state')" optional
          ><template #default="{ id }"
            ><UiInput :id="id" v-model="form.state" autocomplete="address-level1" /></template
        ></UiField>
        <UiField :label="$t('account.postal')" optional
          ><template #default="{ id }"
            ><UiInput :id="id" v-model="form.postal_code" autocomplete="postal-code" /></template
        ></UiField>
      </div>
    </UiCard>
    <UiCard
      :title="$t('auth.currency')"
      :description="
        profile.data.value.currency_locked ? $t('account.currencyLocked') : $t('auth.currencyHint')
      "
    >
      <UiSelect
        v-model="form.currency"
        :aria-label="$t('auth.currency')"
        :options="
          site.enabledCurrencies.value.map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` }))
        "
        class="max-w-xs"
        :disabled="profile.data.value.currency_locked"
      />
    </UiCard>
    <div class="flex items-center justify-end gap-3">
      <p v-if="save.error.value" class="text-[13px] text-danger">{{ errors.text(save.error.value) }}</p>
      <UiButton type="submit" variant="primary" :loading="save.isPending.value">{{
        $t('common.save')
      }}</UiButton>
    </div>
  </form>
</template>
