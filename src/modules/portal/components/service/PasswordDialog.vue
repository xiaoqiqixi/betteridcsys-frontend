<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract'
import type { Service } from '@/contract/commerce'
import { generatePassword, passwordStrongEnough } from '@/modules/store/lib/password'
import { useApiMutation } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useToast } from '@/shared/composables/toast'
import UiButton from '@/shared/ui/UiButton.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'
import UiField from '@/shared/ui/UiField.vue'
import PasswordInput from './PasswordInput.vue'

/** Reset root password or boot into rescue — both take a fresh root password. */
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ service: Service; mode: 'reset' | 'rescue' }>()
const { t } = useI18n()
const toast = useToast()
const errors = useErrorText()
const password = ref(generatePassword())
watch(open, (o) => o && (password.value = generatePassword()))
const ok = computed(() => passwordStrongEnough(password.value))
const opts = {
  invalidates: [api.services.get],
  onSuccess: () => {
    toast.success(t(props.mode === 'reset' ? 'service.resetStarted' : 'service.rescueStarted'))
    open.value = false
  },
}
const reset = useApiMutation(api.services.resetPassword, opts)
const rescue = useApiMutation(api.services.enterRescue, opts)
const m = computed(() => (props.mode === 'reset' ? reset : rescue))
function submit() {
  if (!ok.value) return
  m.value.mutate({ params: { id: props.service.id }, body: { root_password: password.value } })
}
</script>

<template>
  <UiDialog
    v-model:open="open"
    :title="mode === 'reset' ? $t('service.resetPassword') : $t('service.rescue')"
    :description="mode === 'reset' ? $t('service.resetBody') : $t('service.rescueBody')"
  >
    <UiField
      :label="$t('configure.rootPassword')"
      :hint="$t('configure.passwordHint')"
      :error="ok ? null : $t('configure.passwordWeak')"
    >
      <template #default="{ id }"><PasswordInput :id="id" v-model="password" /></template>
    </UiField>
    <p v-if="m.error.value" class="mt-3 text-[13px] text-danger" role="alert">
      {{ errors.text(m.error.value) }}
    </p>
    <template #footer>
      <UiButton variant="ghost" @click="open = false">{{ $t('common.cancel') }}</UiButton>
      <UiButton
        variant="primary"
        :disabled="!ok || m.uncertain.value"
        :loading="m.isPending.value"
        @click="submit"
        >{{ $t('common.confirm') }}</UiButton
      >
    </template>
  </UiDialog>
</template>
