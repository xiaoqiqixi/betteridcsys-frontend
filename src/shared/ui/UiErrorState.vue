<script setup lang="ts">
import { AlertTriangle, RotateCw } from '@lucide/vue'
import { computed } from 'vue'
import { useErrorText } from '@/shared/composables/errors'
import UiButton from './UiButton.vue'

const props = defineProps<{ error: unknown; compact?: boolean }>()
const emit = defineEmits<{ retry: [] }>()
const { describe } = useErrorText()
const info = computed(() => describe(props.error))
</script>

<template>
  <div :class="['flex flex-col items-center text-center', compact ? 'py-6' : 'py-14']" role="alert">
    <div class="mb-3 grid size-10 place-items-center rounded-full bg-danger-soft text-danger">
      <AlertTriangle class="size-5" />
    </div>
    <p class="text-sm font-medium text-fg">{{ info.title }}</p>
    <p class="mt-1 max-w-md text-[13px] text-muted">{{ info.message }}</p>
    <p v-if="info.requestId" class="mt-2 font-mono text-[11px] text-faint">
      Request ID · {{ info.requestId }}
    </p>
    <UiButton class="mt-4" size="sm" @click="emit('retry')"
      ><RotateCw class="size-3.5" />{{ $t('common.retry') }}</UiButton
    >
  </div>
</template>
