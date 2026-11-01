<script setup lang="ts">
import { Lock, Send } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { api } from '@/contract'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { confirm } from '@/shared/composables/confirm'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import { useToast } from '@/shared/composables/toast'
import UiButton from '@/shared/ui/UiButton.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiPageHeader from '@/shared/ui/UiPageHeader.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiStatus from '@/shared/ui/UiStatus.vue'
import UiTextarea from '@/shared/ui/UiTextarea.vue'
import UiTime from '@/shared/ui/UiTime.vue'

const route = useRoute()
const { t } = useI18n()
const f = useFormat()
const toast = useToast()
const errors = useErrorText()
const id = computed(() => String(route.params.id))
const ticket = useApiQuery(api.support.ticket, () => ({ params: { id: id.value } }), {
  refetchInterval: 30_000,
})
const departments = useApiQuery(api.support.departments, {}, { staleTime: 5 * 60_000 })
const tk = computed(() => ticket.data.value)
const body = ref('')
const reply = useApiMutation(api.support.reply, {
  invalidates: [api.support.ticket, api.support.tickets],
  onSuccess: () => (body.value = ''),
})
const close = useApiMutation(api.support.close, { invalidates: [api.support.ticket, api.support.tickets] })
async function doClose() {
  if (
    await confirm({
      title: t('ticket.closeTitle'),
      body: t('ticket.closeBody'),
      confirmLabel: t('ticket.close'),
    })
  )
    close.mutate({ params: { id: id.value }, body: {} }, { onError: (e) => toast.error(errors.text(e)) })
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <UiErrorState v-if="ticket.isError.value" :error="ticket.error.value" @retry="ticket.refetch()" />
    <UiSkeleton v-else-if="!tk" :lines="6" />
    <template v-else>
      <UiPageHeader :title="tk.subject" back="/tickets" :back-label="$t('nav.tickets')">
        <template #badges><UiStatus kind="ticket" :value="tk.status" /></template>
        <template #meta>
          <p class="mt-1 text-[13px] text-muted">
            <span class="font-mono">#{{ tk.number }}</span> ·
            {{ f.text(departments.data.value?.find((d) => d.id === tk!.department_id)?.name) }} ·
            {{ $t(`ticket.priorityLabel.${tk.priority}`) }}
            <template v-if="tk.service_id">
              ·
              <RouterLink
                :to="{ name: 'service', params: { id: tk.service_id } }"
                class="text-primary hover:underline"
                >{{ $t('ticket.relatedService') }}</RouterLink
              ></template
            >
          </p>
        </template>
        <template #actions>
          <UiButton
            v-if="tk.status !== 'closed'"
            variant="ghost"
            :loading="close.isPending.value"
            @click="doClose"
            >{{ $t('ticket.close') }}</UiButton
          >
        </template>
      </UiPageHeader>

      <ol class="flex flex-col gap-4">
        <li
          v-for="m in tk.messages"
          :key="m.id"
          :class="['flex', m.author_type === 'client' ? 'justify-end' : 'justify-start']"
        >
          <div
            :class="[
              'max-w-[88%] rounded-xl border px-4 py-3 sm:max-w-[80%]',
              m.author_type === 'client'
                ? 'border-primary-line bg-primary-soft'
                : m.author_type === 'system'
                  ? 'border-dashed border-line bg-transparent'
                  : 'border-line bg-surface',
            ]"
          >
            <p class="flex items-center gap-2 text-xs">
              <span class="font-medium text-fg">{{
                m.author_type === 'system' ? $t('ticket.system') : m.author_name
              }}</span>
              <span
                v-if="m.author_type === 'staff'"
                class="rounded bg-surface-2 px-1.5 text-[10px] font-semibold text-muted"
                >{{ $t('ticket.staff') }}</span
              >
              <UiTime :value="m.created_at" mode="relative" class="text-faint" />
            </p>
            <p class="mt-1.5 text-sm leading-relaxed break-words whitespace-pre-wrap text-fg-2">
              {{ m.body }}
            </p>
          </div>
        </li>
      </ol>

      <form
        v-if="tk.status !== 'closed'"
        class="sticky bottom-4 mt-6 rounded-xl border border-line bg-surface/95 p-3 shadow-md backdrop-blur"
        @submit.prevent="body.trim() && reply.mutate({ params: { id }, body: { body: body.trim() } })"
      >
        <UiTextarea
          v-model="body"
          :rows="3"
          :placeholder="$t('ticket.replyPlaceholder')"
          @keydown.meta.enter="body.trim() && reply.mutate({ params: { id }, body: { body: body.trim() } })"
        />
        <div class="mt-2 flex items-center justify-between gap-3">
          <p v-if="reply.error.value" class="text-xs text-danger">{{ errors.text(reply.error.value) }}</p>
          <p v-else class="hidden text-xs text-faint sm:block">⌘ / Ctrl + Enter</p>
          <UiButton
            type="submit"
            variant="primary"
            size="sm"
            :loading="reply.isPending.value"
            :disabled="!body.trim() || reply.uncertain.value"
            ><Send class="size-3.5" />{{ $t('ticket.send') }}</UiButton
          >
        </div>
      </form>
      <p v-else class="mt-6 flex items-center justify-center gap-2 text-[13px] text-muted">
        <Lock class="size-3.5" />{{ $t('ticket.closedHint') }}
      </p>
    </template>
  </div>
</template>
