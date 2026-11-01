<script setup lang="ts">
import { CheckCircle2 } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/contract'
import { useApiMutation } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import UiButton from '@/shared/ui/UiButton.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'

const route = useRoute()
const errors = useErrorText()
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const password = ref('')
const confirmPw = ref('')
const reset = useApiMutation(api.auth.resetPassword)
const mismatch = computed(() => confirmPw.value.length > 0 && confirmPw.value !== password.value)
</script>

<template>
  <div class="rounded-2xl border border-line bg-surface/90 p-7 shadow-lg backdrop-blur sm:p-8">
    <template v-if="reset.isSuccess.value">
      <div class="grid size-11 place-items-center rounded-full bg-success-soft text-success">
        <CheckCircle2 class="size-5" />
      </div>
      <h1 class="mt-5 text-[22px] font-semibold tracking-tight">{{ $t('auth.resetDone') }}</h1>
      <UiButton to="/login" variant="primary" block class="mt-6">{{ $t('auth.signIn') }}</UiButton>
    </template>
    <template v-else-if="!token">
      <h1 class="text-[22px] font-semibold tracking-tight">{{ $t('auth.linkInvalid') }}</h1>
      <UiButton to="/forgot-password" variant="secondary" block class="mt-6">{{
        $t('auth.requestNew')
      }}</UiButton>
    </template>
    <template v-else>
      <h1 class="text-[22px] font-semibold tracking-tight">{{ $t('auth.resetTitle') }}</h1>
      <form
        class="mt-7 flex flex-col gap-4"
        novalidate
        @submit.prevent="reset.mutate({ body: { token, password } })"
      >
        <UiField :label="$t('auth.newPassword')" :hint="$t('auth.passwordRule')">
          <template #default="{ id }"
            ><UiInput :id="id" v-model="password" type="password" autocomplete="new-password" size="lg"
          /></template>
        </UiField>
        <UiField :label="$t('auth.confirmPassword')" :error="mismatch ? $t('auth.mismatch') : null">
          <template #default="{ id }"
            ><UiInput :id="id" v-model="confirmPw" type="password" autocomplete="new-password" size="lg"
          /></template>
        </UiField>
        <p v-if="reset.error.value" class="text-[13px] text-danger" role="alert">
          {{ errors.text(reset.error.value) }}
        </p>
        <UiButton
          type="submit"
          variant="primary"
          size="lg"
          block
          :loading="reset.isPending.value"
          :disabled="password.length < 10 || password !== confirmPw"
          >{{ $t('auth.resetSubmit') }}</UiButton
        >
      </form>
    </template>
  </div>
</template>
