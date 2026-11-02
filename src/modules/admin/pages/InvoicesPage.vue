<script setup lang="ts">
import { Plus, Receipt, Trash2 } from '@lucide/vue'
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { api } from '@/contract/admin-endpoints'
import type { z } from 'zod'
import type { InvoiceStatus } from '@/contract/commerce'
import { useApiList, useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { parseDecimal } from '@/shared/lib/money'
import UiBadge from '@/shared/ui/UiBadge.vue'
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

const { t } = useI18n()
const router = useRouter()
const errors = useErrorText()
const q = useQueryParam('q', '')
const status = useQueryParam<'all' | z.infer<typeof InvoiceStatus>>('status', 'all')
const list = useApiList(api.admin.invoices, () => ({
  query: {
    limit: 30,
    ...(q.value ? { q: q.value } : {}),
    ...(status.value === 'all' ? {} : { status: status.value }),
  },
}))
const columns = computed(() => [
  { key: 'number', label: t('invoice.number') },
  { key: 'client', label: t('admin.client.client'), hideBelow: 'md' as const },
  { key: 'kind', label: t('invoice.kindLabel'), hideBelow: 'lg' as const },
  { key: 'status', label: t('common.status') },
  { key: 'total', label: t('invoice.total'), align: 'right' as const },
  { key: 'due', label: t('invoice.due'), align: 'right' as const, hideBelow: 'sm' as const },
])

// Manual invoice
const open = ref(false)
const clientQ = ref('')
const clients = useApiQuery(api.admin.clients, () =>
  open.value && clientQ.value.length >= 2 ? { query: { q: clientQ.value, limit: 10 } } : null,
)
const form = reactive({
  client_id: '',
  due: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
  lines: [{ description: '', amount: '' }],
})
const selected = computed(() => clients.data.value?.items.find((c) => c.id === form.client_id))
const decimals = computed(() => selected.value?.credit.decimal_places ?? 2)
const parsed = computed(() =>
  form.lines.map((l) => ({
    description: l.description.trim(),
    amount_minor: parseDecimal(l.amount, decimals.value),
  })),
)
const valid = computed(
  () => !!form.client_id && parsed.value.every((l) => l.description && l.amount_minor !== null),
)
const create = useApiMutation(api.admin.createInvoice, {
  invalidates: [api.admin.invoices],
  onSuccess: (inv) => router.push({ name: 'admin-invoice', params: { id: inv.id } }),
})
function submit() {
  if (!valid.value) return
  create.mutate({
    body: {
      client_id: form.client_id,
      due_at: new Date(form.due + 'T00:00:00Z').toISOString(),
      lines: parsed.value.map((l) => ({ description: l.description, amount_minor: l.amount_minor! })),
    },
  })
}
</script>

<template>
  <div>
    <UiPageHeader :title="$t('admin.nav.invoices')" :description="$t('admin.invoice.subtitle')">
      <template #actions
        ><UiButton variant="primary" @click="open = true"
          ><Plus class="size-4" />{{ $t('admin.invoice.create') }}</UiButton
        ></template
      >
    </UiPageHeader>
    <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <UiSegmented
        v-model="status"
        :options="
          (['all', 'unpaid', 'paid', 'cancelled', 'refunded'] as const).map((v) => ({
            value: v,
            label: v === 'all' ? $t('common.all') : $t(`status.invoice.${v}`),
          }))
        "
      />
      <SearchInput v-model="q" :placeholder="$t('admin.invoice.search')" />
    </div>
    <div class="rounded-lg border border-line bg-surface shadow-xs">
      <UiErrorState v-if="list.isError.value" :error="list.error.value" @retry="list.refetch()" />
      <UiTable
        v-else
        :columns="columns"
        :rows="list.items.value"
        :row-key="(r) => r.id"
        :to="(r) => ({ name: 'admin-invoice', params: { id: r.id } })"
        :loading="list.isPending.value"
      >
        <template #cell-number="{ row }"
          ><span class="font-mono text-[13px] font-medium">#{{ row.number }}</span></template
        >
        <template #cell-client="{ row }"
          ><span class="text-fg-2">{{ row.client_email }}</span></template
        >
        <template #cell-kind="{ row }"
          ><span class="text-muted">{{ $t(`invoice.kind.${row.kind}`) }}</span></template
        >
        <template #cell-status="{ row }"><UiStatus kind="invoice" :value="row.status" /></template>
        <template #cell-total="{ row }"><UiMoney :value="row.total" class="font-medium" /></template>
        <template #cell-due="{ row }"><UiTime :value="row.due_at" /></template>
        <template #empty><UiEmpty :icon="Receipt" :title="$t('invoice.empty')" /></template>
      </UiTable>
      <UiLoadMore
        :has-more="!!list.hasNextPage.value"
        :loading="list.isFetchingNextPage.value"
        @more="list.fetchNextPage()"
      />
    </div>

    <UiDialog v-model:open="open" :title="$t('admin.invoice.create')" size="lg">
      <form id="manual-invoice" class="flex flex-col gap-4" @submit.prevent="submit">
        <UiField :label="$t('admin.client.client')">
          <template #default="{ id }">
            <div class="flex flex-col gap-2">
              <UiInput
                :id="id"
                v-model="clientQ"
                :placeholder="$t('admin.client.search')"
                autocomplete="off"
              />
              <UiSelect
                v-if="clients.data.value?.items.length"
                v-model="form.client_id"
                :options="
                  clients.data.value.items.map((c) => ({
                    value: c.id,
                    label: c.email,
                    hint: `${c.name} · ${c.currency}`,
                  }))
                "
              />
            </div>
          </template>
        </UiField>
        <UiField :label="$t('invoice.due')"
          ><template #default="{ id }"
            ><UiInput :id="id" v-model="form.due" type="date" class="max-w-48" /></template
        ></UiField>
        <div class="flex flex-col gap-2">
          <p class="text-[13px] font-medium text-fg-2">
            {{ $t('admin.invoice.lines') }} <UiBadge v-if="selected">{{ selected.currency }}</UiBadge>
          </p>
          <div v-for="(l, i) in form.lines" :key="i" class="flex gap-2">
            <UiInput v-model="l.description" :placeholder="$t('invoice.description')" class="flex-1" />
            <UiInput
              v-model="l.amount"
              inputmode="decimal"
              :placeholder="$t('invoice.amount')"
              class="w-32"
            />
            <UiButton
              square
              variant="ghost"
              :aria-label="$t('common.remove')"
              :disabled="form.lines.length === 1"
              @click="form.lines.splice(i, 1)"
              ><Trash2 class="size-3.5"
            /></UiButton>
          </div>
          <div>
            <UiButton size="sm" variant="ghost" @click="form.lines.push({ description: '', amount: '' })"
              ><Plus class="size-3.5" />{{ $t('admin.invoice.addLine') }}</UiButton
            >
          </div>
        </div>
        <p v-if="create.error.value" class="text-[13px] text-danger">{{ errors.text(create.error.value) }}</p>
      </form>
      <template #footer>
        <UiButton variant="ghost" @click="open = false">{{ $t('common.cancel') }}</UiButton>
        <UiButton
          type="submit"
          form="manual-invoice"
          variant="primary"
          :loading="create.isPending.value"
          :disabled="!valid || create.uncertain.value"
          >{{ $t('common.create') }}</UiButton
        >
      </template>
    </UiDialog>
  </div>
</template>
