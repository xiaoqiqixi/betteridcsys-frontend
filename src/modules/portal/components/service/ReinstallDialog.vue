<script setup lang="ts">
import { AlertTriangle } from '@lucide/vue'
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract'
import type { Service } from '@/contract/commerce'
import OsPicker from '@/modules/store/components/OsPicker.vue'
import { generatePassword, passwordStrongEnough } from '@/modules/store/lib/password'
import { useApiMutation, useApiQuery } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useToast } from '@/shared/composables/toast'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCheckbox from '@/shared/ui/UiCheckbox.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiSegmented from '@/shared/ui/UiSegmented.vue'
import PasswordInput from './PasswordInput.vue'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ service: Service }>()
const { t } = useI18n()
const toast = useToast()
const errors = useErrorText()
const keys = useApiQuery(api.account.sshKeys, () => (open.value ? {} : null))
const target = computed(() => props.service.hostname || props.service.id)
const form = reactive({
  os: props.service.os_image?.id as string | undefined,
  auth: 'password' as 'password' | 'ssh',
  password: generatePassword(),
  keys: [] as string[],
  confirm: '',
})
watch(open, (o) => {
  if (o)
    Object.assign(form, {
      os: props.service.os_image?.id,
      password: generatePassword(),
      keys: [],
      confirm: '',
    })
})
const valid = computed(
  () =>
    !!form.os &&
    form.confirm === target.value &&
    (form.auth === 'password' ? passwordStrongEnough(form.password) : form.keys.length > 0),
)
const reinstall = useApiMutation(api.services.reinstall, {
  invalidates: [api.services.get, api.services.list],
  onSuccess: () => {
    toast.success(t('service.reinstallStarted'))
    open.value = false
  },
})
function submit() {
  if (!valid.value || !form.os) return
  reinstall.mutate({
    params: { id: props.service.id },
    body: {
      os_image_id: form.os,
      confirm: form.confirm,
      ...(form.auth === 'password' ? { root_password: form.password } : { ssh_key_ids: form.keys }),
    },
  })
}
</script>

<template>
  <UiDialog v-model:open="open" :title="$t('service.reinstall')" size="lg">
    <div class="flex flex-col gap-5">
      <p class="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
        <AlertTriangle class="mt-0.5 size-4 shrink-0" />{{ $t('service.reinstallWarning') }}
      </p>
      <UiField :label="$t('configure.os')"
        ><OsPicker v-model="form.os" :images="service.available_images"
      /></UiField>
      <UiSegmented
        v-model="form.auth"
        :options="[
          { value: 'password', label: $t('configure.authPassword') },
          { value: 'ssh', label: $t('configure.authSsh') },
        ]"
      />
      <UiField
        v-if="form.auth === 'password'"
        :label="$t('configure.rootPassword')"
        :hint="$t('configure.passwordHint')"
        :error="passwordStrongEnough(form.password) ? null : $t('configure.passwordWeak')"
      >
        <template #default="{ id }"><PasswordInput :id="id" v-model="form.password" /></template>
      </UiField>
      <div v-else class="flex flex-col gap-2">
        <UiCheckbox
          v-for="k in keys.data.value ?? []"
          :key="k.id"
          :model-value="form.keys.includes(k.id)"
          @update:model-value="
            (on: boolean) => (form.keys = on ? [...form.keys, k.id] : form.keys.filter((x) => x !== k.id))
          "
        >
          <span class="font-medium text-fg">{{ k.name }}</span
          ><span class="ml-2 font-mono text-xs text-faint">{{ k.fingerprint }}</span>
        </UiCheckbox>
        <p v-if="keys.data.value && !keys.data.value.length" class="text-[13px] text-muted">
          {{ $t('configure.noSshKeys') }}
          <RouterLink to="/account/ssh-keys" class="text-primary hover:underline">{{
            $t('configure.addSshKey')
          }}</RouterLink>
        </p>
      </div>
      <UiField :label="$t('service.typeHostname', { name: target })">
        <template #default="{ id }"
          ><UiInput :id="id" v-model="form.confirm" mono autocomplete="off" :placeholder="target"
        /></template>
      </UiField>
      <p v-if="reinstall.error.value" class="text-[13px] text-danger" role="alert">
        {{ errors.text(reinstall.error.value) }}
      </p>
    </div>
    <template #footer>
      <UiButton variant="ghost" @click="open = false">{{ $t('common.cancel') }}</UiButton>
      <UiButton
        variant="danger"
        :disabled="!valid || reinstall.uncertain.value"
        :loading="reinstall.isPending.value"
        @click="submit"
        >{{ $t('service.reinstallConfirm') }}</UiButton
      >
    </template>
  </UiDialog>
</template>
