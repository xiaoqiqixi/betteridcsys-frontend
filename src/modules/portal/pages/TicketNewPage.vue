<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/contract/client-endpoints'
import type { TicketPriority } from '@/contract/support'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSelect from '@/shared/ui/UiSelect.vue'
import UiTextarea from '@/shared/ui/UiTextarea.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const f = useFormat()
const errors = useErrorText()
const departments = useApiQuery(api.support.departments)
const services = useApiQuery(api.services.list, { query: { limit: 100 } })
const form = reactive({
  department_id: '',
  subject: '',
  priority: 'normal' as TicketPriority,
  service_id: typeof route.query.service === 'string' ? route.query.service : '',
  body: '',
})
const deptOptions = computed(() =>
  (departments.data.value ?? [])
    .filter((d) => d.visible)
    .map((d) => ({ value: d.id, label: f.text(d.name), hint: f.text(d.description) })),
)
const serviceOptions = computed(() => [
  { value: '', label: '—' },
  ...(services.data.value?.items ?? []).map((s) => ({
    value: s.id,
    label: s.label || s.hostname || s.product_name,
    hint: s.primary_ipv4 ?? undefined,
  })),
])
const priorities = computed(() =>
  (['low', 'normal', 'high', 'urgent'] as const).map((p) => ({
    value: p,
    label: t(`ticket.priorityLabel.${p}`),
  })),
)
const valid = computed(
  () => form.department_id && form.subject.trim().length >= 3 && form.body.trim().length >= 10,
)
const open = useApiMutation(api.support.open, {
  invalidates: [api.support.tickets, api.account.overview],
  onSuccess: (tk) => router.replace({ name: 'ticket', params: { id: tk.id } }),
})
function submit() {
  if (!valid.value) return
  open.mutate({
    body: {
      department_id: form.department_id,
      subject: form.subject.trim(),
      priority: form.priority,
      body: form.body.trim(),
      ...(form.service_id ? { service_id: form.service_id } : {}),
    },
  })
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <UiPageHeader :title="$t('ticket.new')" back="/tickets" :back-label="$t('nav.tickets')" />
    <UiCard>
      <form class="flex flex-col gap-5" @submit.prevent="submit">
        <div class="grid gap-4 sm:grid-cols-2">
          <UiField :label="$t('ticket.department')" required>
            <template #default="{ id }"
              ><UiSelect :id="id" v-model="form.department_id" :options="deptOptions"
            /></template>
          </UiField>
          <UiField :label="$t('ticket.priority')">
            <template #default="{ id }"
              ><UiSelect :id="id" v-model="form.priority" :options="priorities"
            /></template>
          </UiField>
        </div>
        <UiField :label="$t('ticket.relatedService')" optional>
          <template #default="{ id }"
            ><UiSelect :id="id" v-model="form.service_id" :options="serviceOptions"
          /></template>
        </UiField>
        <UiField :label="$t('ticket.subject')" required>
          <template #default="{ id }"><UiInput :id="id" v-model="form.subject" maxlength="200" /></template>
        </UiField>
        <UiField :label="$t('ticket.message')" :hint="$t('ticket.messageHint')" required>
          <template #default="{ id }"><UiTextarea :id="id" v-model="form.body" :rows="8" /></template>
        </UiField>
        <p v-if="open.error.value" class="text-[13px] text-danger" role="alert">
          {{ errors.text(open.error.value) }}
        </p>
        <div class="flex justify-end gap-2">
          <UiButton to="/tickets" variant="ghost">{{ $t('common.cancel') }}</UiButton>
          <UiButton
            type="submit"
            variant="primary"
            :loading="open.isPending.value"
            :disabled="!valid || open.uncertain.value"
            >{{ $t('ticket.submit') }}</UiButton
          >
        </div>
      </form>
    </UiCard>
  </div>
</template>
