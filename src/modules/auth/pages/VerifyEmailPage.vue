<script setup lang="ts">
import { CheckCircle2, XCircle } from '@lucide/vue'
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/contract'
import { useApiMutation } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useSession } from '@/shared/stores/session'
import UiButton from '@/shared/ui/UiButton.vue'
import UiSpinner from '@/shared/ui/UiSpinner.vue'

const route = useRoute()
const session = useSession()
const errors = useErrorText()
const verify = useApiMutation(api.auth.verifyEmail, { onSuccess: () => session.load(true) })
onMounted(() => {
  const token = typeof route.query.token === 'string' ? route.query.token : ''
  if (token) verify.mutate({ body: { token } })
})
</script>

<template>
  <div class="rounded-2xl border border-line bg-surface/90 p-8 text-center shadow-lg backdrop-blur">
    <template v-if="verify.isSuccess.value">
      <CheckCircle2 class="mx-auto size-10 text-success" />
      <h1 class="mt-4 text-xl font-semibold">{{ $t('auth.verified') }}</h1>
      <UiButton :to="session.user ? '/dashboard' : '/login'" variant="primary" block class="mt-6">{{
        $t('common.continue')
      }}</UiButton>
    </template>
    <template v-else-if="verify.isError.value || !route.query.token">
      <XCircle class="mx-auto size-10 text-danger" />
      <h1 class="mt-4 text-xl font-semibold">{{ $t('auth.linkInvalid') }}</h1>
      <p v-if="verify.error.value" class="mt-2 text-sm text-muted">{{ errors.text(verify.error.value) }}</p>
      <UiButton to="/dashboard" variant="secondary" block class="mt-6">{{ $t('nav.dashboard') }}</UiButton>
    </template>
    <template v-else>
      <UiSpinner class="mx-auto size-8 text-primary" />
      <p class="mt-4 text-sm text-muted">{{ $t('auth.verifying') }}</p>
    </template>
  </div>
</template>
