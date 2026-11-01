<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { api, type Locale } from '@/contract'
import { isApiError } from '@/shared/api'
import { useApiMutation } from '@/shared/api/query'
import { queryClient } from '@/shared/api/query-client'
import { useErrorText } from '@/shared/composables/errors'
import { useSite } from '@/shared/composables/site'
import { COUNTRIES, countryName } from '@/shared/lib/countries'
import { useSession } from '@/shared/stores/session'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCheckbox from '@/shared/ui/UiCheckbox.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiSelect from '@/shared/ui/UiSelect.vue'
import { safeRedirect } from '../redirect'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const site = useSite()
const session = useSession()
const errors = useErrorText()

const form = reactive({
  name: '',
  email: '',
  password: '',
  country: '',
  currency: '',
  accept_terms: false,
  referral_code: typeof route.query.ref === 'string' ? route.query.ref : '',
})
watch(
  () => site.currency.value,
  (c) => (form.currency ||= c),
  { immediate: true },
)
const countries = computed(() =>
  COUNTRIES.map((c) => ({ value: c, label: countryName(c, locale.value) })).sort((a, b) =>
    a.label.localeCompare(b.label, locale.value),
  ),
)
const currencies = computed(() =>
  site.enabledCurrencies.value.map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` })),
)
const weak = computed(() => form.password.length > 0 && form.password.length < 10)
const closed = computed(() => site.settings.data.value?.registration_open === false)

const register = useApiMutation(api.auth.register, {
  onSuccess: async (s) => {
    session.apply(s)
    queryClient.clear()
    await router.replace(safeRedirect(route.query.redirect, '/dashboard'))
  },
})
function submit() {
  if (!form.accept_terms) return
  register.mutate({
    body: {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      country: form.country,
      currency: form.currency,
      locale: locale.value as Locale,
      accept_terms: true,
      ...(form.referral_code ? { referral_code: form.referral_code } : {}),
    },
  })
}
const fieldError = (name: string) => errors.field(register.error.value, name)
const formError = computed(() => {
  const e = register.error.value
  if (!e) return null
  if (isApiError(e) && e.code === 'EMAIL_TAKEN') return t('auth.emailTaken')
  return Object.keys(isApiError(e) ? e.fields : {}).length ? null : errors.text(e)
})
</script>

<template>
  <div class="rounded-2xl border border-line bg-surface/90 p-7 shadow-lg backdrop-blur sm:p-8">
    <h1 class="text-[22px] font-semibold tracking-tight">{{ $t('auth.signUpTitle') }}</h1>
    <p class="mt-1.5 text-sm text-muted">{{ $t('auth.signUpSubtitle') }}</p>
    <p v-if="closed" class="mt-6 rounded-md bg-warning-soft px-3 py-2 text-[13px] text-warning">
      {{ $t('auth.registrationClosed') }}
    </p>
    <form v-else class="mt-7 flex flex-col gap-4" novalidate @submit.prevent="submit">
      <UiField :label="$t('auth.name')" :error="fieldError('name')">
        <template #default="{ id }"
          ><UiInput :id="id" v-model="form.name" autocomplete="name" required size="lg"
        /></template>
      </UiField>
      <UiField :label="$t('auth.email')" :error="fieldError('email')">
        <template #default="{ id }"
          ><UiInput
            :id="id"
            v-model="form.email"
            type="email"
            autocomplete="email"
            inputmode="email"
            required
            size="lg"
        /></template>
      </UiField>
      <UiField
        :label="$t('auth.password')"
        :hint="$t('auth.passwordRule')"
        :error="weak ? $t('auth.passwordRule') : fieldError('password')"
      >
        <template #default="{ id }"
          ><UiInput
            :id="id"
            v-model="form.password"
            type="password"
            autocomplete="new-password"
            required
            size="lg"
        /></template>
      </UiField>
      <div class="grid grid-cols-2 gap-3">
        <UiField :label="$t('auth.country')" :error="fieldError('country')">
          <template #default="{ id }"
            ><UiSelect
              :id="id"
              v-model="form.country"
              :options="countries"
              :placeholder="$t('common.select')"
          /></template>
        </UiField>
        <UiField :label="$t('auth.currency')" :hint="$t('auth.currencyHint')">
          <template #default="{ id }"
            ><UiSelect :id="id" v-model="form.currency" :options="currencies"
          /></template>
        </UiField>
      </div>
      <UiCheckbox v-model="form.accept_terms">
        <i18n-t keypath="auth.acceptTerms" tag="span">
          <template #terms>
            <a
              v-if="site.settings.data.value?.terms_url"
              :href="site.settings.data.value.terms_url"
              target="_blank"
              rel="noopener"
              class="text-primary hover:underline"
              >{{ $t('store.footer.terms') }}</a
            >
            <span v-else>{{ $t('store.footer.terms') }}</span>
          </template>
        </i18n-t>
      </UiCheckbox>
      <p v-if="formError" class="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger" role="alert">
        {{ formError }}
      </p>
      <UiButton
        type="submit"
        variant="primary"
        size="lg"
        block
        :loading="register.isPending.value"
        :disabled="
          !form.accept_terms ||
          !form.name ||
          !form.email ||
          form.password.length < 10 ||
          !form.country ||
          !form.currency
        "
      >
        {{ $t('auth.createAccount') }}
      </UiButton>
    </form>
    <p class="mt-6 text-center text-[13px] text-muted">
      {{ $t('auth.haveAccount') }}
      <RouterLink
        :to="{ name: 'login', query: route.query }"
        class="font-medium text-primary hover:underline"
        >{{ $t('auth.signIn') }}</RouterLink
      >
    </p>
  </div>
</template>
