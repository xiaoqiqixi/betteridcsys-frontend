<script setup lang="ts">
import { Laptop, Smartphone } from '@lucide/vue'
import { computed, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract'
import { useApiList, useApiMutation, useApiQuery } from '@/shared/api/query'
import { confirm } from '@/shared/composables/confirm'
import { useErrorText } from '@/shared/composables/errors'
import { useToast } from '@/shared/composables/toast'
import UiBadge from '@/shared/ui/UiBadge.vue'
import UiButton from '@/shared/ui/UiButton.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiLoadMore from '@/shared/ui/UiLoadMore.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiTime from '@/shared/ui/UiTime.vue'

const { t } = useI18n()
const toast = useToast()
const errors = useErrorText()
const pw = reactive({ current: '', next: '', confirm: '' })
const change = useApiMutation(api.account.changePassword, {
  invalidates: [api.account.sessions],
  onSuccess: () => {
    Object.assign(pw, { current: '', next: '', confirm: '' })
    toast.success(t('account.passwordChanged'))
  },
})
const sessions = useApiQuery(api.account.sessions)
const revoke = useApiMutation(api.account.revokeSession, { invalidates: [api.account.sessions] })
const history = useApiList(api.account.loginHistory, { query: { limit: 10 } })
const mismatch = computed(() => pw.confirm.length > 0 && pw.confirm !== pw.next)
const mobile = (ua: string) => /Mobile|Android|iPhone|iPad/i.test(ua)
function browser(ua: string) {
  const m = /(Edg|Chrome|Firefox|Safari)\/[\d.]+/.exec(ua)
  const os = /Windows|Mac OS X|Android|iPhone|iPad|Linux/.exec(ua)?.[0]?.replace('Mac OS X', 'macOS') ?? ''
  return [m?.[1]?.replace('Edg', 'Edge'), os].filter(Boolean).join(' · ') || ua.slice(0, 40)
}
async function doRevoke(id: string) {
  if (await confirm({ title: t('account.revokeTitle'), confirmLabel: t('account.revoke'), tone: 'danger' }))
    revoke.mutate({ params: { id } }, { onError: (e) => toast.error(errors.text(e)) })
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <UiCard :title="$t('account.changePassword')" :description="$t('account.changePasswordHint')">
      <form
        class="grid max-w-md gap-4"
        @submit.prevent="change.mutate({ body: { current_password: pw.current, new_password: pw.next } })"
      >
        <UiField :label="$t('account.currentPassword')"
          ><template #default="{ id }"
            ><UiInput
              :id="id"
              v-model="pw.current"
              type="password"
              autocomplete="current-password" /></template
        ></UiField>
        <UiField :label="$t('auth.newPassword')" :hint="$t('auth.passwordRule')"
          ><template #default="{ id }"
            ><UiInput :id="id" v-model="pw.next" type="password" autocomplete="new-password" /></template
        ></UiField>
        <UiField :label="$t('auth.confirmPassword')" :error="mismatch ? $t('auth.mismatch') : null"
          ><template #default="{ id }"
            ><UiInput :id="id" v-model="pw.confirm" type="password" autocomplete="new-password" /></template
        ></UiField>
        <p v-if="change.error.value" class="text-[13px] text-danger">{{ errors.text(change.error.value) }}</p>
        <div>
          <UiButton
            type="submit"
            variant="primary"
            :loading="change.isPending.value"
            :disabled="!pw.current || pw.next.length < 10 || pw.next !== pw.confirm"
            >{{ $t('account.updatePassword') }}</UiButton
          >
        </div>
      </form>
    </UiCard>

    <UiCard :title="$t('account.sessions')" :description="$t('account.sessionsHint')" :padded="false">
      <div v-if="sessions.isPending.value" class="p-5"><UiSkeleton :lines="3" /></div>
      <UiErrorState
        v-else-if="sessions.isError.value"
        :error="sessions.error.value"
        compact
        @retry="sessions.refetch()"
      />
      <ul v-else class="divide-y divide-line">
        <li v-for="s in sessions.data.value" :key="s.id" class="flex items-center gap-3 px-5 py-3">
          <component :is="mobile(s.user_agent) ? Smartphone : Laptop" class="size-4 shrink-0 text-muted" />
          <div class="min-w-0 flex-1">
            <p class="flex items-center gap-2 text-sm font-medium">
              {{ browser(s.user_agent)
              }}<UiBadge v-if="s.current" tone="success">{{ $t('account.thisDevice') }}</UiBadge>
            </p>
            <p class="text-xs text-muted">
              <span class="font-mono">{{ s.ip }}</span> · {{ $t('account.lastSeen') }}
              <UiTime :value="s.last_seen_at" mode="relative" />
            </p>
          </div>
          <UiButton v-if="!s.current" size="sm" variant="ghost" @click="doRevoke(s.id)">{{
            $t('account.revoke')
          }}</UiButton>
        </li>
      </ul>
    </UiCard>

    <UiCard :title="$t('account.loginHistory')" :padded="false">
      <UiErrorState
        v-if="history.isError.value"
        :error="history.error.value"
        compact
        @retry="history.refetch()"
      />
      <ul v-else class="divide-y divide-line">
        <li
          v-for="e in history.items.value"
          :key="e.id"
          class="flex flex-wrap items-center gap-3 px-5 py-2.5 text-[13px]"
        >
          <span :class="['size-1.5 rounded-full', e.result === 'success' ? 'bg-success' : 'bg-danger']" />
          <span class="min-w-0 flex-1 truncate">{{ browser(e.user_agent) }}</span>
          <span class="font-mono text-xs text-muted">{{ e.ip }}</span>
          <UiTime :value="e.at" mode="datetime" class="text-xs text-muted" />
        </li>
      </ul>
      <UiLoadMore
        :has-more="!!history.hasNextPage.value"
        :loading="history.isFetchingNextPage.value"
        @more="history.fetchNextPage()"
      />
    </UiCard>
  </div>
</template>
