<script setup lang="ts">
import { Search } from '@lucide/vue'
import { refDebounced } from '@vueuse/core'
import { ref, watch } from 'vue'
import UiInput from '@/shared/ui/UiInput.vue'

const model = defineModel<string>({ default: '' })
defineProps<{ placeholder?: string }>()
const local = ref(model.value)
const debounced = refDebounced(local, 300)
watch(debounced, (v) => (model.value = v.trim()))
watch(model, (v) => v !== local.value.trim() && (local.value = v))
</script>

<template>
  <UiInput
    v-model="local"
    type="search"
    size="sm"
    :placeholder="placeholder ?? $t('common.search')"
    class="w-full sm:w-64"
    autocomplete="off"
  >
    <template #prefix><Search class="size-3.5" /></template>
  </UiInput>
</template>
