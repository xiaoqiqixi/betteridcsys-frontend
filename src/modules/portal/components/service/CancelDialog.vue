<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract'
import type { Service } from '@/contract/commerce'
import { useApiMutation } from '@/shared/api/query'
import { useErrorText } from '@/shared/composables/errors'
import { useToast } from '@/shared/composables/toast'
import UiButton from '@/shared/ui/UiButton.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiTextarea from '@/shared/ui/UiTextarea.vue'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ service: Service }>()
const { t } = useI18n()
const toast = useToast()
const errors = useErrorText()
const form = reactive({ type: 'end_of_period' as 'end_of_period' | 'immediate', reason: '' })
watch(open, (o) => o && Object.assign(form, { type: 'end_of_period', reason: '' }))
const cancel = useApiMutation(api.services.requestCancellation, {
  invalidates: [api.services.get, api.services.list],
  onSuccess: () => {
    toast.success(t('service.cancelRequested'))
    open.value = false
  },
})
</script>

<template>
  <UiDialog v-model:open="open" :title="$t('service.cancel')">
    <div class="flex flex-col gap-4">
      <div class="grid gap-2" role="radiogroup">
        <button
          v-for="opt in ['end_of_period', 'immediate'] as const"
          :key="opt"
          type="button"
          role="radio"
          :aria-checked="form.type === opt"
          :class="[
            'rounded-lg border px-4 py-3 text-left',
            form.type === opt
              ? 'border-primary bg-primary-soft ring-1 ring-primary'
              : 'border-line hover:border-line-strong',
          ]"
          @click="form.type = opt"
        >
          <p class="text-sm font-medium">{{ $t(`service.cancelType.${opt}`) }}</p>
          <p class="mt-0.5 text-xs text-muted">
            {{
              $t(`service.cancelTypeHint.${opt}`, {
                date: service.next_due_at ? new Date(service.next_due_at).toLocaleDateString() : '—',
              })
            }}
          </p>
        </button>
      </div>
      <UiField :label="$t('service.cancelReason')">
        <template #default="{ id }"><UiTextarea :id="id" v-model="form.reason" :rows="3" /></template>
      </UiField>
      <p v-if="cancel.error.value" class="text-[13px] text-danger" role="alert">
        {{ errors.text(cancel.error.value) }}
      </p>
    </div>
    <template #footer>
      <UiButton variant="ghost" @click="open = false">{{ $t('common.cancel') }}</UiButton>
      <UiButton
        variant="danger"
        :loading="cancel.isPending.value"
        :disabled="!form.reason.trim()"
        @click="
          cancel.mutate({
            params: { id: props.service.id },
            body: { type: form.type, reason: form.reason.trim() },
          })
        "
      >
        {{ $t('service.cancelConfirm') }}
      </UiButton>
    </template>
  </UiDialog>
</template>
