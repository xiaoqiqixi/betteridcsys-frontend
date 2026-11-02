<script setup lang="ts">
import { KeyRound, Plus, Trash2 } from '@lucide/vue'
import { reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract/client-endpoints'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { confirm } from '@/shared/composables/confirm'
import { useErrorText } from '@/shared/composables/errors'
import { useToast } from '@/shared/composables/toast'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCard from '@/shared/ui/UiCard.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'
import UiEmpty from '@/shared/ui/UiEmpty.vue'
import UiErrorState from '@/shared/ui/UiErrorState.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiSkeleton from '@/shared/ui/UiSkeleton.vue'
import UiTextarea from '@/shared/ui/UiTextarea.vue'
import UiTime from '@/shared/ui/UiTime.vue'

const { t } = useI18n()
const toast = useToast()
const errors = useErrorText()
const keys = useApiQuery(api.account.sshKeys)
const open = ref(false)
const form = reactive({ name: '', public_key: '' })
const add = useApiMutation(api.account.addSshKey, {
  invalidates: [api.account.sshKeys],
  onSuccess: () => {
    open.value = false
    Object.assign(form, { name: '', public_key: '' })
    toast.success(t('account.keyAdded'))
  },
})
const remove = useApiMutation(api.account.deleteSshKey, { invalidates: [api.account.sshKeys] })
async function doRemove(id: string, name: string) {
  if (
    await confirm({
      title: t('account.deleteKey', { name }),
      body: t('account.deleteKeyBody'),
      tone: 'danger',
      confirmLabel: t('common.delete'),
    })
  )
    remove.mutate({ params: { id } }, { onError: (e) => toast.error(errors.text(e)) })
}
</script>

<template>
  <UiCard :title="$t('account.tab.ssh')" :description="$t('account.sshHint')" :padded="false">
    <template #actions
      ><UiButton size="sm" variant="primary" @click="open = true"
        ><Plus class="size-3.5" />{{ $t('account.addKey') }}</UiButton
      ></template
    >
    <div v-if="keys.isPending.value" class="p-5"><UiSkeleton :lines="3" /></div>
    <UiErrorState v-else-if="keys.isError.value" :error="keys.error.value" compact @retry="keys.refetch()" />
    <UiEmpty
      v-else-if="!keys.data.value?.length"
      compact
      :icon="KeyRound"
      :title="$t('configure.noSshKeys')"
    />
    <ul v-else class="divide-y divide-line">
      <li v-for="k in keys.data.value" :key="k.id" class="flex items-center gap-3 px-5 py-3">
        <KeyRound class="size-4 shrink-0 text-muted" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium">
            {{ k.name }} <span class="ml-1 text-xs font-normal text-faint">{{ k.algorithm }}</span>
          </p>
          <p class="truncate font-mono text-xs text-muted">{{ k.fingerprint }}</p>
        </div>
        <UiTime :value="k.created_at" class="hidden text-xs text-muted sm:inline" />
        <UiButton
          size="sm"
          variant="danger-ghost"
          square
          :aria-label="$t('common.delete')"
          @click="doRemove(k.id, k.name)"
          ><Trash2 class="size-3.5"
        /></UiButton>
      </li>
    </ul>
    <UiDialog v-model:open="open" :title="$t('account.addKey')" size="lg">
      <form
        id="ssh-form"
        class="flex flex-col gap-4"
        @submit.prevent="add.mutate({ body: { name: form.name.trim(), public_key: form.public_key.trim() } })"
      >
        <UiField :label="$t('account.keyName')"
          ><template #default="{ id }"
            ><UiInput :id="id" v-model="form.name" maxlength="80" placeholder="MacBook" /></template
        ></UiField>
        <UiField
          :label="$t('account.publicKey')"
          :hint="$t('account.publicKeyHint')"
          :error="errors.field(add.error.value, 'public_key')"
        >
          <template #default="{ id }"
            ><UiTextarea
              :id="id"
              v-model="form.public_key"
              :rows="5"
              class="font-mono text-xs"
              placeholder="ssh-ed25519 AAAA… you@host"
          /></template>
        </UiField>
        <p
          v-if="add.error.value && !errors.field(add.error.value, 'public_key')"
          class="text-[13px] text-danger"
        >
          {{ errors.text(add.error.value) }}
        </p>
      </form>
      <template #footer>
        <UiButton variant="ghost" @click="open = false">{{ $t('common.cancel') }}</UiButton>
        <UiButton
          type="submit"
          form="ssh-form"
          variant="primary"
          :loading="add.isPending.value"
          :disabled="!form.name.trim() || form.public_key.trim().length < 40"
          >{{ $t('account.addKey') }}</UiButton
        >
      </template>
    </UiDialog>
  </UiCard>
</template>
