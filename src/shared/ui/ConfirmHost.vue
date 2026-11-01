<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { confirmState } from '@/shared/composables/confirm'
import UiButton from './UiButton.vue'
import UiDialog from './UiDialog.vue'
import UiInput from './UiInput.vue'

const typed = ref('')
const open = computed({
  get: () => !!confirmState.current,
  set: (v) => {
    if (!v) finish(false)
  },
})
watch(
  () => confirmState.current,
  () => (typed.value = ''),
)
const ready = computed(
  () => !confirmState.current?.typed || typed.value.trim() === confirmState.current.typed,
)
function finish(ok: boolean) {
  const c = confirmState.current
  confirmState.current = null
  c?.resolve(ok)
}
</script>

<template>
  <UiDialog v-if="confirmState.current" v-model:open="open" :title="confirmState.current.title" size="sm">
    <p v-if="confirmState.current.body" class="text-sm whitespace-pre-line text-fg-2">
      {{ confirmState.current.body }}
    </p>
    <div v-if="confirmState.current.typed" class="mt-4 flex flex-col gap-2">
      <p class="text-[13px] text-muted">
        {{ $t('common.typeToConfirm') }}
        <code class="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-fg">{{
          confirmState.current.typed
        }}</code>
      </p>
      <UiInput v-model="typed" mono autocomplete="off" @keydown.enter="ready && finish(true)" />
    </div>
    <template #footer>
      <UiButton variant="ghost" @click="finish(false)">{{ $t('common.cancel') }}</UiButton>
      <UiButton
        :variant="confirmState.current.tone === 'danger' ? 'danger' : 'primary'"
        :disabled="!ready"
        @click="finish(true)"
      >
        {{ confirmState.current.confirmLabel ?? $t('common.confirm') }}
      </UiButton>
    </template>
  </UiDialog>
</template>
