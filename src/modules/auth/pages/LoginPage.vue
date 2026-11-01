<script setup lang="ts">
import { Eye, EyeOff } from '@lucide/vue'
import { reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/contract'
import { isApiError } from '@/shared/api'
import { useApiMutation } from '@/shared/api/query'
import { queryClient } from '@/shared/api/query-client'
import { useErrorText } from '@/shared/composables/errors'
import { useSession } from '@/shared/stores/session'
import UiButton from '@/shared/ui/UiButton.vue'
import UiCheckbox from '@/shared/ui/UiCheckbox.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import { safeRedirect } from '../redirect'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const session = useSession()
const errors = useErrorText()
const form = reactive({ email: '', password: '', remember: true })
const reveal = ref(false)

const login = useApiMutation(api.auth.login, {
  onSuccess: async (s) => {
    session.apply(s)
    queryClient.clear()
    const fallback = s.user?.role === 'admin' ? '/admin' : '/dashboard'
    await router.replace(safeRedirect(route.query.redirect, fallback))
  },
})
function message(e: unknown) {
  if (isApiError(e) && e.code === 'INVALID_CREDENTIALS') return t('auth.invalidCredentials')
  if (isApiError(e) && e.code === 'RATE_LIMITED') return t('auth.rateLimited', { s: e.retryAfter ?? 60 })
  return errors.text(e)
}
</script>

<template>
  <div class="rounded-2xl border border-line bg-surface/90 p-7 shadow-lg backdrop-blur sm:p-8">
    <h1 class="text-[22px] font-semibold tracking-tight">{{ $t('auth.signInTitle') }}</h1>
    <p class="mt-1.5 text-sm text-muted">{{ $t('auth.signInSubtitle') }}</p>
    <form class="mt-7 flex flex-col gap-4" novalidate @submit.prevent="login.mutate({ body: form })">
      <UiField :label="$t('auth.email')">
        <template #default="{ id }">
          <UiInput
            :id="id"
            v-model="form.email"
            type="email"
            autocomplete="username"
            inputmode="email"
            required
            size="lg"
            autofocus
          />
        </template>
      </UiField>
      <UiField :label="$t('auth.password')">
        <template #aside>
          <RouterLink to="/forgot-password" class="text-xs text-muted hover:text-fg">{{
            $t('auth.forgot')
          }}</RouterLink>
        </template>
        <template #default="{ id }">
          <UiInput
            :id="id"
            v-model="form.password"
            :type="reveal ? 'text' : 'password'"
            autocomplete="current-password"
            required
            size="lg"
          >
            <template #suffix>
              <button
                type="button"
                class="grid size-7 place-items-center rounded hover:text-fg"
                :aria-label="$t('configure.togglePassword')"
                @click="reveal = !reveal"
              >
                <EyeOff v-if="reveal" class="size-4" /><Eye v-else class="size-4" />
              </button>
            </template>
          </UiInput>
        </template>
      </UiField>
      <UiCheckbox v-model="form.remember" :label="$t('auth.remember')" />
      <p
        v-if="login.error.value"
        class="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger"
        role="alert"
      >
        {{ message(login.error.value) }}
      </p>
      <UiButton
        type="submit"
        variant="primary"
        size="lg"
        block
        :loading="login.isPending.value"
        :disabled="!form.email || !form.password"
      >
        {{ $t('auth.signIn') }}
      </UiButton>
    </form>
    <p class="mt-6 text-center text-[13px] text-muted">
      {{ $t('auth.noAccount') }}
      <RouterLink
        :to="{ name: 'register', query: route.query }"
        class="font-medium text-primary hover:underline"
        >{{ $t('auth.signUp') }}</RouterLink
      >
    </p>
  </div>
</template>
