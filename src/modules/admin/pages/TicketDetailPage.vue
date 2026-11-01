<script setup lang="ts">
import { Lock, Send } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/contract'
import type { TicketPriority, TicketStatus } from '@/contract/support'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import { useToast } from '@/shared/composables/toast'
import { useSession } from '@/shared/stores/session'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSegmented from '@/shared/ui/UiSegmented.vue'
import UiSelect from '@/shared/ui/UiSelect.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiStatus from '@/shared/ui/UiStatus.vue'
import UiTextarea from '@/shared/ui/UiTextarea.vue'
import UiTime from '@/shared/ui/UiTime.vue'

const route = useRoute()
const f = useFormat()
const toast = useToast()
const errors = useErrorText()
const session = useSession()
const id = computed(() => String(route.params.id))
const ticket = useApiQuery(api.admin.ticket, () => ({ params: { id: id.value } }), {
  refetchInterval: 20_000,
})
const departments = useApiQuery(api.admin.departments, {}, { staleTime: 5 * 60_000 })
const staff = useApiQuery(api.admin.staffMembers, () => (session.can('staff.write') ? {} : null))
const tk = computed(() => ticket.data.value)
const body = ref('')
const mode = ref<'reply' | 'note'>('reply')
const fail = (e: unknown) => toast.error(errors.text(e))
const reply = useApiMutation(api.admin.replyTicket, {
  invalidates: [api.admin.ticket, api.admin.tickets],
  onSuccess: () => (body.value = ''),
})
const patch = useApiMutation(api.admin.updateTicket, { invalidates: [api.admin.ticket, api.admin.tickets] })
function send() {
  if (!body.value.trim()) return
  reply.mutate(
    { params: { id: id.value }, body: { body: body.value.trim(), internal: mode.value === 'note' } },
    { onError: fail },
  )
}
const set = (b: {
  status?: TicketStatus
  priority?: TicketPriority
  department_id?: string
  assignee_id?: string | null
}) => patch.mutate({ params: { id: id.value }, body: b }, { onError: fail })
const canWrite = computed(() => session.can('tickets.write'))
</script>

<template>
  <div>
    <UiErrorState v-if="ticket.isError.value" :error="ticket.error.value" @retry="ticket.refetch()" />
    <UiSkeleton v-else-if="!tk" :lines="8" />
    <template v-else>
      <UiPageHeader :title="tk.subject" back="/admin/tickets" :back-label="$t('admin.nav.tickets')">
        <template #badges><UiStatus kind="ticket" :value="tk.status" /></template>
        <template #meta
          ><p class="mt-1 text-[13px] text-muted">
            <span class="font-mono">#{{ tk.number }}</span> ·
            <RouterLink
              :to="{ name: 'admin-client', params: { id: tk.client_id } }"
              class="text-fg-2 hover:text-primary"
              >{{ tk.client_email }}</RouterLink
            ><template v-if="tk.service_id">
              ·
              <RouterLink
                :to="{ name: 'admin-service', params: { id: tk.service_id } }"
                class="text-primary hover:underline"
                >{{ $t('ticket.relatedService') }}</RouterLink
              ></template
            >
          </p></template
        >
      </UiPageHeader>
      <div class="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div class="min-w-0">
          <ol class="flex flex-col gap-4">
            <li
              v-for="m in tk.messages"
              :key="m.id"
              :class="['flex', m.author_type === 'staff' ? 'justify-end' : 'justify-start']"
            >
              <div
                :class="[
                  'max-w-[88%] rounded-xl border px-4 py-3',
                  m.internal
                    ? 'border-dashed border-warning/50 bg-warning-soft'
                    : m.author_type === 'staff'
                      ? 'border-primary-line bg-primary-soft'
                      : m.author_type === 'system'
                        ? 'border-dashed border-line'
                        : 'border-line bg-surface',
                ]"
              >
                <p class="flex items-center gap-2 text-xs">
                  <span class="font-medium">{{ m.author_name }}</span>
                  <span v-if="m.internal" class="inline-flex items-center gap-1 text-warning"
                    ><Lock class="size-3" />{{ $t('admin.ticket.internal') }}</span
                  >
                  <UiTime :value="m.created_at" mode="datetime" class="text-faint" />
                </p>
                <p class="mt-1.5 text-sm leading-relaxed break-words whitespace-pre-wrap text-fg-2">
                  {{ m.body }}
                </p>
              </div>
            </li>
          </ol>
          <div
            v-if="canWrite"
            class="sticky bottom-4 mt-6 rounded-xl border border-line bg-surface/95 p-3 shadow-md backdrop-blur"
          >
            <UiSegmented
              v-model="mode"
              size="sm"
              :options="[
                { value: 'reply', label: $t('admin.ticket.reply') },
                { value: 'note', label: $t('admin.ticket.note') },
              ]"
              class="mb-2"
            />
            <UiTextarea
              v-model="body"
              :rows="4"
              :placeholder="
                mode === 'note' ? $t('admin.ticket.notePlaceholder') : $t('ticket.replyPlaceholder')
              "
              @keydown.meta.enter="send"
            />
            <div class="mt-2 flex items-center justify-between gap-3">
              <p class="text-xs text-faint">
                {{ mode === 'note' ? $t('admin.ticket.noteHint') : '⌘ / Ctrl + Enter' }}
              </p>
              <UiButton
                :variant="mode === 'note' ? 'secondary' : 'primary'"
                size="sm"
                :loading="reply.isPending.value"
                :disabled="!body.trim() || reply.uncertain.value"
                @click="send"
                ><Send class="size-3.5" />{{
                  mode === 'note' ? $t('admin.ticket.addNote') : $t('ticket.send')
                }}</UiButton
              >
            </div>
          </div>
        </div>
        <UiCard :title="$t('common.details')">
          <fieldset :disabled="!canWrite || patch.isPending.value" class="flex flex-col gap-4">
            <UiField :label="$t('common.status')"
              ><template #default="{ id: fid }"
                ><UiSelect
                  :id="fid"
                  :model-value="tk.status"
                  size="sm"
                  :options="
                    (['open', 'answered', 'customer_reply', 'on_hold', 'closed'] as const).map((v) => ({
                      value: v,
                      label: $t(`status.ticket.${v}`),
                    }))
                  "
                  @update:model-value="(v) => set({ status: v as TicketStatus })" /></template
            ></UiField>
            <UiField :label="$t('ticket.priority')"
              ><template #default="{ id: fid }"
                ><UiSelect
                  :id="fid"
                  :model-value="tk.priority"
                  size="sm"
                  :options="
                    (['low', 'normal', 'high', 'urgent'] as const).map((v) => ({
                      value: v,
                      label: $t(`ticket.priorityLabel.${v}`),
                    }))
                  "
                  @update:model-value="(v) => set({ priority: v as TicketPriority })" /></template
            ></UiField>
            <UiField :label="$t('ticket.department')"
              ><template #default="{ id: fid }"
                ><UiSelect
                  :id="fid"
                  :model-value="tk.department_id"
                  size="sm"
                  :options="
                    (departments.data.value ?? []).map((d) => ({ value: d.id, label: f.text(d.name) }))
                  "
                  @update:model-value="(v) => set({ department_id: v as string })" /></template
            ></UiField>
            <UiField :label="$t('admin.ticket.assignee')">
              <template #default="{ id: fid }">
                <UiSelect
                  :id="fid"
                  :model-value="tk.assignee_id ?? ''"
                  size="sm"
                  :options="[
                    { value: '', label: $t('admin.ticket.unassigned') },
                    ...(staff.data.value ?? [])
                      .filter((s) => s.status === 'active')
                      .map((s) => ({ value: s.id, label: s.name || s.email })),
                  ]"
                  @update:model-value="(v) => set({ assignee_id: (v as string) || null })"
                />
              </template>
            </UiField>
            <UiButton
              v-if="!tk.assignee_id && session.user"
              size="sm"
              @click="set({ assignee_id: session.user.id })"
              >{{ $t('admin.ticket.assignMe') }}</UiButton
            >
          </fieldset>
        </UiCard>
      </div>
    </template>
  </div>
</template>
