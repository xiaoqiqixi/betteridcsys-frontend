<script setup lang="ts">
import { Check, Copy, Eye, EyeOff, RefreshCw } from '@lucide/vue'
import { ref } from 'vue'
import { generatePassword } from '@/modules/store/lib/password'
import UiInput from '@/shared/ui/UiInput.vue'

const model = defineModel<string>({ required: true })
defineProps<{ id?: string; invalid?: boolean }>()
const show = ref(false)
const copied = ref(false)
async function copy() {
  try {
    await navigator.clipboard.writeText(model.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    show.value = true
  }
}
</script>

<template>
  <UiInput
    :id="id"
    v-model="model"
    :invalid="invalid"
    :type="show ? 'text' : 'password'"
    mono
    autocomplete="new-password"
  >
    <template #suffix>
      <button
        type="button"
        class="grid size-7 place-items-center rounded hover:text-fg"
        :aria-label="$t('configure.togglePassword')"
        @click="show = !show"
      >
        <EyeOff v-if="show" class="size-4" /><Eye v-else class="size-4" />
      </button>
      <button
        type="button"
        class="grid size-7 place-items-center rounded hover:text-fg"
        :aria-label="$t('common.copy')"
        @click="copy"
      >
        <Check v-if="copied" class="size-4 text-success" /><Copy v-else class="size-4" />
      </button>
      <button
        type="button"
        class="grid size-7 place-items-center rounded hover:text-fg"
        :aria-label="$t('configure.regenerate')"
        @click="model = generatePassword()"
      >
        <RefreshCw class="size-4" />
      </button>
    </template>
  </UiInput>
</template>
