<script setup lang="ts">
import { Plus, Users } from '@lucide/vue'
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { api, type Locale } from '@/contract/admin-endpoints'
import { useApiList, useApiMutation } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useSite } from '@/shared/composables/site'
import { COUNTRIES, countryName } from '@/shared/lib/countries'
import UiButton from '@/shared/ui/UiButton.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'
import UiEmpty from '@/shared/ui/UiEmpty.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiLoadMore from '@/shared/ui/UiLoadMore.vue'
import UiMoney from '@/shared/ui/UiMoney.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSegmented from '@/shared/ui/UiSegmented.vue'
import UiSelect from '@/shared/ui/UiSelect.vue'
import UiStatus from '@/shared/ui/UiStatus.vue'
import UiTable from '@/shared/ui/UiTable.vue'
import UiTime from '@/shared/ui/UiTime.vue'
import SearchInput from '../components/SearchInput.vue'
import { useQueryParam } from '../components/useQueryParam'

const { t, locale } = useI18n()
const router = useRouter()
const site = useSite()
const errors = useErrorText()
const q = useQueryParam('q', '')
const status = useQueryParam<'all' | 'active' | 'disabled' | 'closed'>('status', 'all')
const list = useApiList(api.admin.clients, () => ({
  query: {
    limit: 30,
    ...(q.value ? { q: q.value } : {}),
    ...(status.value === 'all' ? {} : { status: status.value }),
  },
}))
const columns = computed(() => [
  { key: 'client', label: t('admin.client.client') },
  { key: 'country', label: t('auth.country'), hideBelow: 'lg' as const },
  { key: 'services', label: t('nav.services'), align: 'right' as const, hideBelow: 'md' as const },
  { key: 'credit', label: t('nav.credit'), align: 'right' as const, hideBelow: 'md' as const },
  { key: 'status', label: t('common.status') },
  { key: 'created', label: t('common.created'), align: 'right' as const, hideBelow: 'sm' as const },
])
const open = ref(false)
const form = reactive({
  email: '',
  name: '',
  company: '',
  country: '',
  currency: '',
  locale: 'en' as Locale,
  password: '',
})
const create = useApiMutation(api.admin.createClient, {
  invalidates: [api.admin.clients],
  onSuccess: (c) => router.push({ name: 'admin-client', params: { id: c.id } }),
})
function submit() {
  create.mutate({
    body: {
      email: form.email.trim(),
      name: form.name.trim(),
      country: form.country,
      currency: form.currency || site.currency.value,
      locale: form.locale,
      ...(form.company ? { company: form.company } : {}),
      ...(form.password ? { password: form.password } : {}),
    },
  })
}
const countries = computed(() =>
  COUNTRIES.map((c) => ({ value: c, label: countryName(c, locale.value) })).sort((a, b) =>
    a.label.localeCompare(b.label, locale.value),
  ),
)
</script>

<template>
  <div>
    <UiPageHeader :title="$t('admin.nav.clients')" :description="$t('admin.client.subtitle')">
      <template #actions
        ><UiButton variant="primary" @click="open = true"
          ><Plus class="size-4" />{{ $t('admin.client.create') }}</UiButton
        ></template
      >
    </UiPageHeader>
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <UiSegmented
        v-model="status"
        :options="
          (['all', 'active', 'disabled', 'closed'] as const).map((v) => ({
            value: v,
            label: v === 'all' ? $t('common.all') : $t(`status.client.${v}`),
          }))
        "
      />
      <SearchInput v-model="q" :placeholder="$t('admin.client.search')" />
    </div>
    <div class="rounded-lg border border-line bg-surface shadow-xs">
      <UiErrorState v-if="list.isError.value" :error="list.error.value" @retry="list.refetch()" />
      <UiTable
        v-else
        :columns="columns"
        :rows="list.items.value"
        :row-key="(r) => r.id"
        :to="(r) => ({ name: 'admin-client', params: { id: r.id } })"
        :loading="list.isPending.value"
      >
        <template #cell-client="{ row }">
          <p class="font-medium text-fg">{{ row.name || row.email }}</p>
          <p class="text-xs text-muted">
            {{ row.email }}<template v-if="row.company"> · {{ row.company }}</template>
          </p>
        </template>
        <template #cell-country="{ row }"
          ><span class="text-muted">{{ countryName(row.country, locale) }}</span></template
        >
        <template #cell-services="{ row }"
          ><span class="num">{{ row.services }}</span></template
        >
        <template #cell-credit="{ row }"><UiMoney :value="row.credit" /></template>
        <template #cell-status="{ row }"><UiStatus kind="client" :value="row.status" /></template>
        <template #cell-created="{ row }"><UiTime :value="row.created_at" /></template>
        <template #empty><UiEmpty :icon="Users" :title="$t('admin.client.empty')" /></template>
      </UiTable>
      <UiLoadMore
        :has-more="!!list.hasNextPage.value"
        :loading="list.isFetchingNextPage.value"
        @more="list.fetchNextPage()"
      />
    </div>

    <UiDialog v-model:open="open" :title="$t('admin.client.create')" size="lg">
      <form id="client-form" class="grid gap-4 sm:grid-cols-2" @submit.prevent="submit">
        <UiField :label="$t('auth.email')" class="sm:col-span-2"
          ><template #default="{ id }"
            ><UiInput :id="id" v-model="form.email" type="email" autocomplete="off" /></template
        ></UiField>
        <UiField :label="$t('auth.name')"
          ><template #default="{ id }"><UiInput :id="id" v-model="form.name" /></template
        ></UiField>
        <UiField :label="$t('account.company')" optional
          ><template #default="{ id }"><UiInput :id="id" v-model="form.company" /></template
        ></UiField>
        <UiField :label="$t('auth.country')"
          ><template #default="{ id }"
            ><UiSelect :id="id" v-model="form.country" :options="countries" /></template
        ></UiField>
        <UiField :label="$t('auth.currency')"
          ><template #default="{ id }"
            ><UiSelect
              :id="id"
              v-model="form.currency"
              :options="site.enabledCurrencies.value.map((c) => ({ value: c.code, label: c.code }))"
              :placeholder="site.currency.value" /></template
        ></UiField>
        <UiField :label="$t('account.language')"
          ><template #default="{ id }"
            ><UiSelect
              :id="id"
              v-model="form.locale"
              :options="[
                { value: 'zh-CN', label: '简体中文' },
                { value: 'en', label: 'English' },
              ]" /></template
        ></UiField>
        <UiField :label="$t('auth.password')" :hint="$t('admin.client.passwordHint')" optional
          ><template #default="{ id }"
            ><UiInput
              :id="id"
              v-model="form.password"
              type="password"
              autocomplete="new-password" /></template
        ></UiField>
        <p v-if="create.error.value" class="text-[13px] text-danger sm:col-span-2">
          {{ errors.text(create.error.value) }}
        </p>
      </form>
      <template #footer>
        <UiButton variant="ghost" @click="open = false">{{ $t('common.cancel') }}</UiButton>
        <UiButton
          type="submit"
          form="client-form"
          variant="primary"
          :loading="create.isPending.value"
          :disabled="
            !form.email.includes('@') ||
            !form.name.trim() ||
            !form.country ||
            (!!form.password && form.password.length < 10)
          "
          >{{ $t('common.create') }}</UiButton
        >
      </template>
    </UiDialog>
  </div>
</template>
