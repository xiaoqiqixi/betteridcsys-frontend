<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract/admin-endpoints'
import type { AutomationSettings } from '@/contract/admin'
import { useApiList, useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useToast } from '@/shared/composables/toast'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiLoadMore from '@/shared/ui/UiLoadMore.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiStatus from '@/shared/ui/UiStatus.vue'
import UiSwitch from '@/shared/ui/UiSwitch.vue'
import UiTable from '@/shared/ui/UiTable.vue'
import UiTime from '@/shared/ui/UiTime.vue'

const { t } = useI18n()
const toast = useToast()
const errors = useErrorText()
const settings = useApiQuery(api.admin.automation)
const runs = useApiList(api.admin.automationRuns, { query: { limit: 20 } })
const form = reactive<AutomationSettings & { reminders: string; overdue: string }>({} as never)
watch(
  () => settings.data.value,
  (s) =>
    s &&
    Object.assign(form, s, {
      reminders: s.reminder_days_before_due.join(', '),
      overdue: s.overdue_reminder_days.join(', '),
    }),
  { immediate: true },
)
const days = (v: string) =>
  v
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number)
const invalid = computed(() => {
  if (!settings.data.value) return null
  if (form.suspend_after_days >= form.terminate_after_days)
    return t('admin.automation.suspendBeforeTerminate')
  if ([...days(form.reminders), ...days(form.overdue)].some((n) => !Number.isInteger(n) || n < 0 || n > 60))
    return t('admin.automation.daysInvalid')
  return null
})
const save = useApiMutation(api.admin.updateAutomation, {
  invalidates: [api.admin.automation],
  onSuccess: () => toast.success(t('common.saved')),
})
function submit() {
  if (invalid.value) return
  const { reminders, overdue, ...rest } = form
  save.mutate(
    {
      body: {
        ...rest,
        reminder_days_before_due: days(reminders).sort((a, b) => b - a),
        overdue_reminder_days: days(overdue).sort((a, b) => a - b),
      },
    },
    { onError: (e) => toast.error(errors.text(e)) },
  )
}
const numbers = [
  'invoice_days_before_due',
  'suspend_after_days',
  'terminate_after_days',
  'cancel_unpaid_orders_after_days',
  'affiliate_hold_days',
  'ticket_autoclose_hours',
] as const
const columns = computed(() => [
  { key: 'job', label: t('admin.automation.job') },
  { key: 'status', label: t('common.status') },
  {
    key: 'counts',
    label: t('admin.automation.processed'),
    align: 'right' as const,
    hideBelow: 'sm' as const,
  },
  { key: 'started', label: t('admin.automation.started'), align: 'right' as const },
])
</script>

<template>
  <div>
    <UiPageHeader :title="$t('admin.nav.automation')" :description="$t('admin.automation.subtitle')" />
    <UiErrorState v-if="settings.isError.value" :error="settings.error.value" @retry="settings.refetch()" />
    <UiSkeleton v-else-if="!settings.data.value" :lines="8" />
    <form v-else class="grid gap-6 lg:grid-cols-2" @submit.prevent="submit">
      <UiCard :title="$t('admin.automation.billing')">
        <div class="grid gap-4 sm:grid-cols-2">
          <UiField
            v-for="k in numbers"
            :key="k"
            :label="$t(`admin.automation.field.${k}`)"
            :hint="$t(`admin.automation.hint.${k}`)"
          >
            <template #default="{ id }"
              ><UiInput :id="id" v-model.number="form[k]" type="number" min="0"
            /></template>
          </UiField>
          <UiField
            :label="$t('admin.automation.field.reminders')"
            :hint="$t('admin.automation.hint.reminders')"
            ><template #default="{ id }"><UiInput :id="id" v-model="form.reminders" /></template
          ></UiField>
          <UiField :label="$t('admin.automation.field.overdue')" :hint="$t('admin.automation.hint.overdue')"
            ><template #default="{ id }"><UiInput :id="id" v-model="form.overdue" /></template
          ></UiField>
        </div>
      </UiCard>
      <div class="flex flex-col gap-6">
        <UiCard :title="$t('admin.automation.behaviour')">
          <div class="flex flex-col gap-4">
            <UiSwitch
              v-model="form.auto_provision"
              :label="$t('admin.automation.autoProvision')"
              :description="$t('admin.automation.autoProvisionHint')"
            />
            <UiSwitch
              v-model="form.auto_apply_credit"
              :label="$t('admin.automation.autoCredit')"
              :description="$t('admin.automation.autoCreditHint')"
            />
          </div>
        </UiCard>
        <div class="flex items-center justify-end gap-3">
          <p v-if="invalid" class="text-[13px] text-danger">{{ invalid }}</p>
          <UiButton type="submit" variant="primary" :loading="save.isPending.value" :disabled="!!invalid">{{
            $t('common.save')
          }}</UiButton>
        </div>
      </div>
    </form>

    <h2 class="mt-10 mb-3 text-[15px] font-semibold">{{ $t('admin.automation.runs') }}</h2>
    <div class="rounded-lg border border-line bg-surface shadow-xs">
      <UiTable
        :columns="columns"
        :rows="runs.items.value"
        :row-key="(r) => r.id"
        :loading="runs.isPending.value"
      >
        <template #cell-job="{ row }"
          ><p class="font-medium">{{ $t(`admin.automation.jobs.${row.job}`) }}</p>
          <p v-if="row.message" class="text-xs text-muted">{{ row.message }}</p></template
        >
        <template #cell-status="{ row }"><UiStatus kind="task" :value="row.status" /></template>
        <template #cell-counts="{ row }"
          ><span class="num">{{ row.processed }}</span
          ><span v-if="row.failed" class="num ml-2 text-danger">−{{ row.failed }}</span></template
        >
        <template #cell-started="{ row }"><UiTime :value="row.started_at" mode="relative" /></template>
        <template #empty
          ><p class="px-5 py-8 text-center text-[13px] text-muted">
            {{ $t('admin.automation.noRuns') }}
          </p></template
        >
      </UiTable>
      <UiLoadMore
        :has-more="!!runs.hasNextPage.value"
        :loading="runs.isFetchingNextPage.value"
        @more="runs.fetchNextPage()"
      />
    </div>
  </div>
</template>
