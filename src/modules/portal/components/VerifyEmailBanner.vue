<script setup lang="ts">
import { MailWarning } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract'
import { useApiMutation } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useToast } from '@/shared/composables/toast'
import { useSession } from '@/shared/stores/session'
import UiButton from '@/shared/ui/UiButton.vue'

const session = useSession()
const toast = useToast()
const errors = useErrorText()
const { t } = useI18n()
const resend = useApiMutation(api.auth.resendVerification, {
  onSuccess: () => toast.success(t('portal.verifySent')),
})
function send() {
  resend.mutate({ body: {} }, { onError: (e) => toast.error(errors.text(e)) })
}
</script>

<template>
  <div
    v-if="session.user && !session.user.email_verified"
    class="mb-6 flex flex-col gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-[13px] sm:flex-row sm:items-center sm:justify-between"
  >
    <p class="flex items-center gap-2 text-warning">
      <MailWarning class="size-4 shrink-0" />{{ $t('portal.verifyBanner', { email: session.user.email }) }}
    </p>
    <UiButton
      size="sm"
      variant="secondary"
      :loading="resend.isPending.value"
      :disabled="resend.isSuccess.value"
      @click="send"
      >{{ $t('portal.resend') }}</UiButton
    >
  </div>
</template>
