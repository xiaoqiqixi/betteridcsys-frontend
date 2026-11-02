<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/contract/client-endpoints'
import type { ModuleFields, ServerCustomAction } from '@/contract/server'
import { useApiMutation } from '@/shared/api/query'
import { confirm } from '@/shared/composables/confirm'
import { useErrorText } from '@/shared/composables/errors'
import { useFormat } from '@/shared/composables/format'
import { schemaDefaults } from '@/shared/lib/module-schema'
import SchemaForm from '@/shared/ui/SchemaForm.vue'
import UiButton from '@/shared/ui/UiButton.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'

const props = defineProps<{ serviceId: string; action: ServerCustomAction }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const f = useFormat()
const errors = useErrorText()
const input = ref<ModuleFields>(schemaDefaults(props.action.input_schema))
const form = ref<InstanceType<typeof SchemaForm>>()
const mutation = useApiMutation(api.services.action, { invalidates: [api.services.get] })
const confirming = ref(false)
async function submit() {
  if (mutation.isPending.value || mutation.uncertain.value || confirming.value || !form.value?.validate())
    return
  if (props.action.danger || props.action.confirm) {
    confirming.value = true
    const ok = await confirm({
      title: f.text(props.action.name),
      body: f.text(props.action.confirm) || t('serverModules.dangerConfirm'),
      tone: props.action.danger ? 'danger' : 'primary',
    })
    confirming.value = false
    if (!ok) return
  }
  mutation.mutate(
    { params: { id: props.serviceId, action_id: props.action.id }, body: { input: { ...input.value } } },
    {
      onSuccess: () => {
        input.value = {}
        emit('close')
      },
      onSettled: () => {
        input.value = {}
      },
    },
  )
}
</script>

<template>
  <UiDialog
    :open="true"
    :title="f.text(action.name)"
    :description="f.text(action.confirm) || undefined"
    :dismissible="!mutation.isPending.value && !confirming"
    @update:open="(open) => !open && emit('close')"
  >
    <form class="grid gap-4" @submit.prevent="submit">
      <SchemaForm
        ref="form"
        v-model="input"
        :schema="action.input_schema"
        :disabled="mutation.isPending.value || mutation.uncertain.value || confirming"
      />
      <p v-if="mutation.isError.value" role="alert" class="text-sm text-danger">
        {{ errors.text(mutation.error.value) }}
      </p>
      <p v-if="mutation.uncertain.value" role="status" class="text-sm text-warning">
        {{ $t('serverModules.uncertain') }}
      </p>
      <div class="flex justify-end gap-2">
        <UiButton :disabled="mutation.isPending.value || confirming" @click="emit('close')">{{
          $t('common.close')
        }}</UiButton>
        <UiButton
          type="submit"
          :variant="action.danger ? 'danger' : 'primary'"
          :loading="mutation.isPending.value"
          :disabled="mutation.uncertain.value || confirming"
          >{{ f.text(action.name) }}</UiButton
        >
      </div>
    </form>
  </UiDialog>
</template>
