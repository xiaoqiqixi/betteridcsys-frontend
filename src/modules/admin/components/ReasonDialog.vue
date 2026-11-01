<script setup lang="ts">
import { ref, watch } from 'vue'
import UiButton from '@/shared/ui/UiButton.vue'
import UiDialog from '@/shared/ui/UiDialog.vue'
import UiField from '@/shared/ui/UiField.vue'
import UiInput from '@/shared/ui/UiInput.vue'
import UiTextarea from '@/shared/ui/UiTextarea.vue'

/** Staff confirmation that requires an audited reason (and optionally a typed confirmation). */
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  title: string
  body?: string
  confirmLabel: string
  tone?: 'primary' | 'danger'
  typed?: string
  loading?: boolean
  error?: string | null
}>()
const emit = defineEmits<{ confirm: [reason: string] }>()
const reason = ref('')
const typedValue = ref('')
watch(open, (o) => o && ((reason.value = ''), (typedValue.value = '')))
const ready = () =>
  reason.value.trim().length >= 3 && (!props.typed || typedValue.value.trim() === props.typed)
</script>

<template>
  <UiDialog v-model:open="open" :title="title" :description="body" size="sm">
    <form
      :id="`reason-${title}`"
      class="flex flex-col gap-4"
      @submit.prevent="ready() && emit('confirm', reason.trim())"
    >
      <UiField :label="$t('admin.reason')" :hint="$t('admin.reasonHint')"
        ><template #default="{ id }"><UiTextarea :id="id" v-model="reason" :rows="3" /></template
      ></UiField>
      <UiField v-if="typed" :label="$t('service.typeHostname', { name: typed })"
        ><template #default="{ id }"
          ><UiInput :id="id" v-model="typedValue" mono autocomplete="off" /></template
      ></UiField>
      <p v-if="error" class="text-[13px] text-danger">{{ error }}</p>
    </form>
    <template #footer>
      <UiButton variant="ghost" @click="open = false">{{ $t('common.cancel') }}</UiButton>
      <UiButton
        type="submit"
        :form="`reason-${title}`"
        :variant="tone === 'danger' ? 'danger' : 'primary'"
        :loading="loading"
        :disabled="!ready()"
        >{{ confirmLabel }}</UiButton
      >
    </template>
  </UiDialog>
</template>
