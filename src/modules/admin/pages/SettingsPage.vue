<script setup lang="ts">
import { ArrowUpCircle, Plus, RefreshCw } from '@lucide/vue'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract'
import type { CurrencyRegistry, SiteSettings } from '@/contract/site'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useToast } from '@/shared/composables/toast'
import BrandMark from '@/shared/ui/BrandMark.vue'
import UiBadge from '@/shared/ui/UiBadge.vue'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiCheckbox from '@/shared/ui/UiCheckbox.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSegmented from '@/shared/ui/UiSegmented.vue'
import UiSelect from '@/shared/ui/UiSelect.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiSwitch from '@/shared/ui/UiSwitch.vue'
import UiTime from '@/shared/ui/UiTime.vue'
import LocalizedInput from '../components/LocalizedInput.vue'
import { useQueryParam } from '../components/useQueryParam'

const { t } = useI18n()
const toast = useToast()
const errors = useErrorText()
const fail = (e: unknown) => toast.error(errors.text(e))
const saved = () => toast.success(t('common.saved'))
const URL_HINT = 'https://'
const tab = useQueryParam<'site' | 'currencies' | 'security' | 'updates'>('tab', 'site')

const siteQ = useApiQuery(api.admin.siteSettings, () => (tab.value === 'site' ? {} : null))
const siteForm = ref<SiteSettings | null>(null)
const sf = computed(() => siteForm.value!)
watch(
  () => siteQ.data.value,
  (v) => v && (siteForm.value = JSON.parse(JSON.stringify(v))),
  { immediate: true },
)
const saveSite = useApiMutation(api.admin.updateSiteSettings, {
  invalidates: [api.admin.siteSettings, api.site.settings],
  onSuccess: saved,
})

const currencyQ = useApiQuery(api.admin.currencies, () => (tab.value === 'currencies' ? {} : null))
const registry = ref<CurrencyRegistry | null>(null)
const reg = computed(() => registry.value!)
watch(
  () => currencyQ.data.value,
  (v) => v && (registry.value = JSON.parse(JSON.stringify(v))),
  { immediate: true },
)
const saveCurrencies = useApiMutation(api.admin.updateCurrencies, {
  invalidates: [api.admin.currencies, api.site.currencies],
  onSuccess: saved,
})
function addCurrency() {
  registry.value?.currencies.push({
    code: '',
    name: '',
    prefix: '',
    suffix: '',
    decimal_places: 2,
    enabled: false,
    sort_order: (registry.value.currencies.length + 1) * 10,
    precision_locked: false,
  })
}

const securityQ = useApiQuery(api.admin.security, () => (tab.value === 'security' ? {} : null))
const secForm = reactive({
  client_session_hours: 168,
  staff_session_hours: 8,
  password_min_length: 10,
  revision: 0,
})
watch(
  () => securityQ.data.value,
  (v) => v && Object.assign(secForm, v),
  { immediate: true },
)
const saveSecurity = useApiMutation(api.admin.updateSecurity, {
  invalidates: [api.admin.security],
  onSuccess: saved,
})

const updatesQ = useApiQuery(api.admin.updates, () => (tab.value === 'updates' ? {} : null))
const checkUpdates = useApiMutation(api.admin.checkUpdates, { invalidates: [api.admin.updates] })
</script>

<template>
  <div>
    <UiPageHeader :title="$t('admin.nav.settings')" :description="$t('admin.settings.subtitle')" />
    <div class="mb-5">
      <UiSegmented
        v-model="tab"
        :options="
          (['site', 'currencies', 'security', 'updates'] as const).map((v) => ({
            value: v,
            label: $t(`admin.settings.tab.${v}`),
          }))
        "
      />
    </div>

    <template v-if="tab === 'site'">
      <UiErrorState v-if="siteQ.isError.value" :error="siteQ.error.value" @retry="siteQ.refetch()" />
      <UiSkeleton v-else-if="!siteForm" :lines="10" />
      <form
        v-else
        class="grid gap-6 lg:grid-cols-2"
        @submit.prevent="saveSite.mutate({ body: sf }, { onError: fail })"
      >
        <UiCard :title="$t('admin.settings.brand')">
          <div class="flex flex-col gap-4">
            <UiField :label="$t('admin.settings.siteName')"
              ><template #default="{ id }"
                ><UiInput :id="id" v-model="sf.site_name" maxlength="80" /></template
            ></UiField>
            <UiField :label="$t('admin.settings.tagline')"
              ><template #default="{ id }"
                ><LocalizedInput
                  :id="id"
                  :model-value="sf.tagline ?? {}"
                  :maxlength="160"
                  @update:model-value="(v) => (sf.tagline = v)" /></template
            ></UiField>
            <div class="grid grid-cols-2 gap-4">
              <UiField :label="$t('admin.settings.logo')">
                <template #default>
                  <div class="flex gap-2">
                    <button
                      v-for="l in ['orbit', 'star', 'cloud', 'server'] as const"
                      :key="l"
                      type="button"
                      :aria-pressed="sf.logo === l"
                      :aria-label="`${$t('admin.settings.logo')} ${l}`"
                      :class="['rounded-lg p-1 ring-2', sf.logo === l ? 'ring-primary' : 'ring-transparent']"
                      @click="sf.logo = l"
                    >
                      <BrandMark :logo="l" :size="30" />
                    </button>
                  </div>
                </template>
              </UiField>
              <UiField :label="$t('admin.settings.accent')"
                ><template #default="{ id }"
                  ><UiSelect
                    :id="id"
                    v-model="sf.accent"
                    :options="
                      (['blue', 'violet', 'emerald', 'amber'] as const).map((a) => ({
                        value: a,
                        label: $t(`admin.settings.accents.${a}`),
                      }))
                    " /></template
              ></UiField>
            </div>
            <UiField :label="$t('theme.label')"
              ><template #default="{ id }"
                ><UiSelect
                  :id="id"
                  v-model="sf.theme"
                  :options="
                    (['system', 'light', 'dark'] as const).map((v) => ({ value: v, label: $t(`theme.${v}`) }))
                  " /></template
            ></UiField>
          </div>
        </UiCard>
        <div class="flex flex-col gap-6">
          <UiCard :title="$t('admin.settings.company')">
            <div class="flex flex-col gap-4">
              <UiField :label="$t('admin.settings.companyName')" :hint="$t('admin.settings.companyHint')"
                ><template #default="{ id }"><UiInput :id="id" v-model="sf.company_name" /></template
              ></UiField>
              <UiField :label="$t('admin.settings.companyAddress')"
                ><template #default="{ id }"><UiInput :id="id" v-model="sf.company_address" /></template
              ></UiField>
              <UiField :label="$t('admin.settings.supportEmail')"
                ><template #default="{ id }"
                  ><UiInput :id="id" v-model="sf.support_email" type="email" /></template
              ></UiField>
              <div class="grid gap-4 sm:grid-cols-2">
                <UiField :label="$t('store.footer.terms')"
                  ><template #default="{ id }"
                    ><UiInput :id="id" v-model="sf.terms_url" :placeholder="URL_HINT" /></template
                ></UiField>
                <UiField :label="$t('store.footer.privacy')"
                  ><template #default="{ id }"
                    ><UiInput :id="id" v-model="sf.privacy_url" :placeholder="URL_HINT" /></template
                ></UiField>
              </div>
              <div class="grid gap-4 sm:grid-cols-3">
                <UiField label="Telegram"
                  ><template #default="{ id }"
                    ><UiInput :id="id" v-model="sf.social.telegram" size="sm" /></template
                ></UiField>
                <UiField label="Discord"
                  ><template #default="{ id }"
                    ><UiInput :id="id" v-model="sf.social.discord" size="sm" /></template
                ></UiField>
                <UiField label="X"
                  ><template #default="{ id }"><UiInput :id="id" v-model="sf.social.x" size="sm" /></template
                ></UiField>
              </div>
            </div>
          </UiCard>
          <UiCard :title="$t('admin.settings.access')">
            <div class="flex flex-col gap-4">
              <UiField :label="$t('admin.settings.defaultLocale')"
                ><template #default="{ id }"
                  ><UiSelect
                    :id="id"
                    v-model="sf.default_locale"
                    :options="[
                      { value: 'zh-CN', label: '简体中文' },
                      { value: 'en', label: 'English' },
                    ]" /></template
              ></UiField>
              <UiSwitch v-model="sf.registration_open" :label="$t('admin.settings.registrationOpen')" />
              <UiSwitch
                v-model="sf.email_verification_required"
                :label="$t('admin.settings.verificationRequired')"
                :description="$t('admin.settings.verificationHint')"
              />
            </div>
          </UiCard>
          <div class="flex justify-end">
            <UiButton type="submit" variant="primary" :loading="saveSite.isPending.value">{{
              $t('common.save')
            }}</UiButton>
          </div>
        </div>
      </form>
    </template>

    <template v-else-if="tab === 'currencies'">
      <UiErrorState
        v-if="currencyQ.isError.value"
        :error="currencyQ.error.value"
        @retry="currencyQ.refetch()"
      />
      <UiSkeleton v-else-if="!registry" :lines="6" />
      <UiCard
        v-else
        :title="$t('admin.settings.currencies')"
        :description="$t('admin.settings.currenciesHint')"
        :padded="false"
      >
        <div class="overflow-x-auto">
          <table class="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr class="border-b border-line text-left text-xs text-muted">
                <th class="px-4 py-2 font-medium">{{ $t('admin.settings.code') }}</th>
                <th class="px-2 py-2 font-medium">{{ $t('admin.product.name') }}</th>
                <th class="px-2 py-2 font-medium">{{ $t('admin.settings.prefix') }}</th>
                <th class="px-2 py-2 font-medium">{{ $t('admin.settings.suffix') }}</th>
                <th class="px-2 py-2 font-medium">{{ $t('admin.settings.decimals') }}</th>
                <th class="px-2 py-2 font-medium">{{ $t('admin.product.sortOrder') }}</th>
                <th class="px-2 py-2 font-medium">{{ $t('admin.settings.default') }}</th>
                <th class="px-4 py-2 font-medium">{{ $t('admin.integration.enabled') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="c in reg.currencies"
                :key="c.code || c.sort_order"
                class="border-b border-line last:border-0"
              >
                <td class="px-4 py-2">
                  <UiInput
                    v-model="c.code"
                    size="sm"
                    mono
                    maxlength="3"
                    class="w-20"
                    :disabled="c.precision_locked"
                  />
                </td>
                <td class="px-2 py-2"><UiInput v-model="c.name" size="sm" /></td>
                <td class="px-2 py-2"><UiInput v-model="c.prefix" size="sm" class="w-16" /></td>
                <td class="px-2 py-2"><UiInput v-model="c.suffix" size="sm" class="w-16" /></td>
                <td class="px-2 py-2">
                  <UiInput
                    v-model.number="c.decimal_places"
                    type="number"
                    min="0"
                    max="6"
                    size="sm"
                    class="w-16"
                    :disabled="c.precision_locked"
                  /><UiBadge v-if="c.precision_locked" class="mt-1">{{
                    $t('admin.settings.locked')
                  }}</UiBadge>
                </td>
                <td class="px-2 py-2">
                  <UiInput v-model.number="c.sort_order" type="number" size="sm" class="w-20" />
                </td>
                <td class="px-2 py-2">
                  <input
                    v-model="reg.default_currency"
                    type="radio"
                    :value="c.code"
                    class="accent-[var(--primary)]"
                    :aria-label="$t('admin.settings.default')"
                  />
                </td>
                <td class="px-4 py-2"><UiCheckbox v-model="c.enabled" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <template #footer>
          <UiButton size="sm" variant="ghost" class="mr-auto" @click="addCurrency"
            ><Plus class="size-3.5" />{{ $t('admin.settings.addCurrency') }}</UiButton
          >
          <UiButton
            variant="primary"
            :loading="saveCurrencies.isPending.value"
            @click="saveCurrencies.mutate({ body: reg }, { onError: fail })"
            >{{ $t('common.save') }}</UiButton
          >
        </template>
      </UiCard>
    </template>

    <template v-else-if="tab === 'security'">
      <UiSkeleton v-if="!securityQ.data.value" :lines="4" />
      <UiCard v-else :title="$t('admin.settings.tab.security')" class="max-w-2xl">
        <form
          class="grid gap-4 sm:grid-cols-3"
          @submit.prevent="saveSecurity.mutate({ body: secForm }, { onError: fail })"
        >
          <UiField :label="$t('admin.settings.clientSession')"
            ><template #default="{ id }"
              ><UiInput :id="id" v-model.number="secForm.client_session_hours" type="number" min="1" max="720"
                ><template #suffix>h</template></UiInput
              ></template
            ></UiField
          >
          <UiField :label="$t('admin.settings.staffSession')"
            ><template #default="{ id }"
              ><UiInput :id="id" v-model.number="secForm.staff_session_hours" type="number" min="1" max="24"
                ><template #suffix>h</template></UiInput
              ></template
            ></UiField
          >
          <UiField :label="$t('admin.settings.passwordMin')"
            ><template #default="{ id }"
              ><UiInput
                :id="id"
                v-model.number="secForm.password_min_length"
                type="number"
                min="10"
                max="128" /></template
          ></UiField>
          <div class="flex justify-end sm:col-span-3">
            <UiButton type="submit" variant="primary" :loading="saveSecurity.isPending.value">{{
              $t('common.save')
            }}</UiButton>
          </div>
        </form>
      </UiCard>
    </template>

    <template v-else>
      <UiSkeleton v-if="!updatesQ.data.value" :lines="3" />
      <UiCard v-else class="max-w-2xl">
        <div class="flex items-start gap-4">
          <ArrowUpCircle
            :class="['size-6', updatesQ.data.value.update_available ? 'text-primary' : 'text-success']"
          />
          <div class="min-w-0 flex-1">
            <p class="font-medium">
              {{
                updatesQ.data.value.update_available
                  ? $t('admin.settings.updateAvailable', { v: updatesQ.data.value.latest_version })
                  : $t('admin.settings.upToDate')
              }}
            </p>
            <p class="mt-1 text-[13px] text-muted">
              {{ $t('admin.settings.current', { v: updatesQ.data.value.current_version }) }} ·
              {{ $t('admin.settings.checked') }}
              <UiTime :value="updatesQ.data.value.checked_at" mode="relative" />
            </p>
            <p class="mt-3 text-[13px] text-muted">{{ $t('admin.settings.updateHint') }}</p>
            <a
              v-if="updatesQ.data.value.release_notes_url"
              :href="updatesQ.data.value.release_notes_url"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-2 inline-block text-[13px] text-primary hover:underline"
              >{{ $t('admin.settings.releaseNotes') }} →</a
            >
          </div>
          <UiButton
            size="sm"
            :loading="checkUpdates.isPending.value"
            @click="checkUpdates.mutate({ body: {} }, { onError: fail })"
            ><RefreshCw class="size-3.5" />{{ $t('admin.settings.checkNow') }}</UiButton
          >
        </div>
      </UiCard>
    </template>
  </div>
</template>
