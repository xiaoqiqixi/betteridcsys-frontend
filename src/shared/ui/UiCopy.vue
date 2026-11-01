<script setup lang="ts">
import { Check, Copy } from '@lucide/vue'
import { ref } from 'vue'

const props = defineProps<{ text: string; mono?: boolean; label?: string }>()
const done = ref(false)
async function copy() {
  try {
    await navigator.clipboard.writeText(props.text)
    done.value = true
    setTimeout(() => (done.value = false), 1400)
  } catch {
    /* Clipboard may be unavailable on insecure origins; the text stays selectable. */
  }
}
</script>

<template>
  <span class="inline-flex max-w-full items-center gap-1.5">
    <span :class="['truncate select-all', mono && 'font-mono text-[13px]']">{{ label ?? text }}</span>
    <button
      type="button"
      class="grid size-6 shrink-0 place-items-center rounded text-faint transition-colors hover:bg-surface-2 hover:text-fg"
      :aria-label="$t('common.copy')"
      @click.stop="copy"
    >
      <Check v-if="done" class="size-3.5 text-success" />
      <Copy v-else class="size-3.5" />
    </button>
  </span>
</template>
