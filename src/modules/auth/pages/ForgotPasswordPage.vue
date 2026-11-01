<script setup lang="ts">
import { MailCheck } from '@lucide/vue'
import { ref } from 'vue'
import { api } from '@/contract'
import { useApiMutation } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import UiButton from '@/shared/ui/UiButton.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'

const email = ref('')
const errors = useErrorText()
const send = useApiMutation(api.auth.forgotPassword)
</script>

<template>
  <div class="rounded-2xl border border-line bg-surface/90 p-7 shadow-lg backdrop-blur sm:p-8">
    <template v-if="send.isSuccess.value">
      <div class="grid size-11 place-items-center rounded-full bg-success-soft text-success">
        <MailCheck class="size-5" />
      </div>
      <h1 class="mt-5 text-[22px] font-semibold tracking-tight">{{ $t('auth.checkInbox') }}</h1>
      <p class="mt-2 text-sm leading-relaxed text-muted">{{ $t('auth.resetSent', { email }) }}</p>
      <UiButton to="/login" variant="secondary" block class="mt-6">{{ $t('auth.backToSignIn') }}</UiButton>
    </template>
    <template v-else>
      <h1 class="text-[22px] font-semibold tracking-tight">{{ $t('auth.forgotTitle') }}</h1>
      <p class="mt-1.5 text-sm text-muted">{{ $t('auth.forgotSubtitle') }}</p>
      <form
        class="mt-7 flex flex-col gap-4"
        novalidate
        @submit.prevent="send.mutate({ body: { email: email.trim() } })"
      >
        <UiField :label="$t('auth.email')">
          <template #default="{ id }"
            ><UiInput :id="id" v-model="email" type="email" autocomplete="email" required size="lg" autofocus
          /></template>
        </UiField>
        <p v-if="send.error.value" class="text-[13px] text-danger" role="alert">
          {{ errors.text(send.error.value) }}
        </p>
        <UiButton
          type="submit"
          variant="primary"
          size="lg"
          block
          :loading="send.isPending.value"
          :disabled="!email.includes('@')"
          >{{ $t('auth.sendReset') }}</UiButton
        >
      </form>
      <p class="mt-6 text-center text-[13px]">
        <RouterLink to="/login" class="text-muted hover:text-fg">{{ $t('auth.backToSignIn') }}</RouterLink>
      </p>
    </template>
  </div>
</template>
