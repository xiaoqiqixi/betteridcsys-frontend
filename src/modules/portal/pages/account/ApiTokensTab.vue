<script setup lang="ts">
import { AlertTriangle, Code2, Plus } from '@lucide/vue'
import { reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract/client-endpoints'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { confirm } from '@/shared/composables/confirm'
import { useErrorText } from '@/shared/composables/errors'
import { useToast } from '@/shared/composables/toast'
import UiBadge from '@/shared/ui/UiBadge.vue'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiCheckbox from '@/shared/ui/UiCheckbox.vue'
import UiCopy from '@/shared/ui/UiCopy.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'
import UiEmpty from '@/shared/ui/UiEmpty.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiSelect from '@/shared/ui/UiSelect.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiTextarea from '@/shared/ui/UiTextarea.vue'
import UiTime from '@/shared/ui/UiTime.vue'

const { t } = useI18n()
const toast = useToast()
const errors = useErrorText()
const tokens = useApiQuery(api.account.apiTokens)
const open = ref(false)
const secret = ref<string | null>(null)
const form = reactive({ name: '', write: false, ips: '', expiry: '90' })
const create = useApiMutation(api.account.createApiToken, {
  invalidates: [api.account.apiTokens],
  onSuccess: (r) => {
    secret.value = r.secret
    Object.assign(form, { name: '', write: false, ips: '', expiry: '90' })
  },
})
const revoke = useApiMutation(api.account.revokeApiToken, { invalidates: [api.account.apiTokens] })
function submit() {
  create.mutate({
    body: {
      name: form.name.trim(),
      scopes: form.write ? ['read', 'write'] : ['read'],
      ip_allowlist: form.ips
        .split(/[\s,]+/)
        .map((x) => x.trim())
        .filter(Boolean),
      expires_in_days: form.expiry === 'never' ? null : Number(form.expiry),
    },
  })
}
function close() {
  open.value = false
  secret.value = null
}
async function doRevoke(id: string, name: string) {
  if (
    await confirm({
      title: t('account.revokeToken', { name }),
      body: t('account.revokeTokenBody'),
      tone: 'danger',
      confirmLabel: t('account.revoke'),
    })
  )
    revoke.mutate({ params: { id } }, { onError: (e) => toast.error(errors.text(e)) })
}
</script>

<template>
  <UiCard :title="$t('account.tab.tokens')" :description="$t('account.tokensHint')" :padded="false">
    <template #actions
      ><UiButton size="sm" variant="primary" @click="open = true"
        ><Plus class="size-3.5" />{{ $t('account.createToken') }}</UiButton
      ></template
    >
    <div v-if="tokens.isPending.value" class="p-5"><UiSkeleton :lines="3" /></div>
    <UiErrorState
      v-else-if="tokens.isError.value"
      :error="tokens.error.value"
      compact
      @retry="tokens.refetch()"
    />
    <UiEmpty v-else-if="!tokens.data.value?.length" compact :icon="Code2" :title="$t('account.noTokens')" />
    <ul v-else class="divide-y divide-line">
      <li v-for="tk in tokens.data.value" :key="tk.id" class="flex flex-wrap items-center gap-3 px-5 py-3">
        <div class="min-w-0 flex-1">
          <p class="flex items-center gap-2 text-sm font-medium">
            {{ tk.name
            }}<UiBadge v-for="s in tk.scopes" :key="s" :tone="s === 'write' ? 'warning' : 'neutral'">{{
              s
            }}</UiBadge>
          </p>
          <p class="text-xs text-muted">
            <span class="font-mono">{{ tk.prefix }}…</span> · {{ $t('account.lastUsed') }}
            <UiTime :value="tk.last_used_at" mode="relative" /> ·
            {{ tk.expires_at ? $t('account.expires') : $t('account.noExpiry') }}
            <UiTime v-if="tk.expires_at" :value="tk.expires_at" />
          </p>
        </div>
        <UiButton size="sm" variant="danger-ghost" @click="doRevoke(tk.id, tk.name)">{{
          $t('account.revoke')
        }}</UiButton>
      </li>
    </ul>
    <UiDialog
      :open="open"
      :title="secret ? $t('account.tokenCreated') : $t('account.createToken')"
      :dismissible="!secret"
      @update:open="(v: boolean) => !v && close()"
    >
      <div v-if="secret" class="flex flex-col gap-3">
        <p class="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2.5 text-[13px] text-warning">
          <AlertTriangle class="mt-0.5 size-4 shrink-0" />{{ $t('account.tokenOnce') }}
        </p>
        <div class="rounded-lg border border-line bg-surface-2 px-3 py-2.5">
          <UiCopy :text="secret" mono />
        </div>
      </div>
      <form v-else id="token-form" class="flex flex-col gap-4" @submit.prevent="submit">
        <UiField :label="$t('account.tokenName')"
          ><template #default="{ id }"
            ><UiInput :id="id" v-model="form.name" maxlength="60" placeholder="terraform" /></template
        ></UiField>
        <UiCheckbox v-model="form.write" :label="$t('account.allowWrite')" />
        <UiField :label="$t('account.ipAllowlist')" :hint="$t('account.ipAllowlistHint')" optional>
          <template #default="{ id }"
            ><UiTextarea
              :id="id"
              v-model="form.ips"
              :rows="2"
              class="font-mono text-xs"
              placeholder="203.0.113.10, 2001:db8::/48"
          /></template>
        </UiField>
        <UiField :label="$t('account.expiry')">
          <template #default="{ id }">
            <UiSelect
              :id="id"
              v-model="form.expiry"
              :options="[
                { value: '30', label: $t('account.days', { n: 30 }) },
                { value: '90', label: $t('account.days', { n: 90 }) },
                { value: '365', label: $t('account.days', { n: 365 }) },
                { value: 'never', label: $t('account.noExpiry') },
              ]"
            />
          </template>
        </UiField>
        <p v-if="create.error.value" class="text-[13px] text-danger">{{ errors.text(create.error.value) }}</p>
      </form>
      <template #footer>
        <UiButton v-if="secret" variant="primary" @click="close">{{ $t('account.savedIt') }}</UiButton>
        <template v-else>
          <UiButton variant="ghost" @click="close">{{ $t('common.cancel') }}</UiButton>
          <UiButton
            type="submit"
            form="token-form"
            variant="primary"
            :loading="create.isPending.value"
            :disabled="!form.name.trim()"
            >{{ $t('common.create') }}</UiButton
          >
        </template>
      </template>
    </UiDialog>
  </UiCard>
</template>
