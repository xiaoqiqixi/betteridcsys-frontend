<script setup lang="ts">
import { ref } from 'vue'
import type { Locale, LocalizedText } from '@/contract/admin-endpoints'
import UiInput from '@/shared/ui/UiInput.vue'
import UiTextarea from '@/shared/ui/UiTextarea.vue'

/** Edits one text in every supported locale; empty locales fall back to the site default. */
const model = defineModel<LocalizedText>({ required: true })
defineProps<{ multiline?: boolean; id?: string; maxlength?: number }>()
const LOCALES: { code: Locale; label: string }[] = [
  { code: 'zh-CN', label: '中文' },
  { code: 'en', label: 'EN' },
]
const active = ref<Locale>('zh-CN')
function set(v: string | number | null | undefined) {
  model.value = { ...model.value, [active.value]: String(v ?? '') }
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex gap-1">
      <button
        v-for="l in LOCALES"
        :key="l.code"
        type="button"
        :class="[
          'rounded px-2 py-0.5 text-[11px] font-medium',
          active === l.code ? 'bg-primary-soft text-primary' : 'text-muted hover:text-fg',
          !model[l.code] && 'italic',
        ]"
        @click="active = l.code"
      >
        {{ l.label }}<span v-if="!model[l.code]" class="ml-0.5 text-faint">∅</span>
      </button>
    </div>
    <UiTextarea
      v-if="multiline"
      :id="id"
      :model-value="model[active] ?? ''"
      :rows="3"
      :maxlength="maxlength"
      @update:model-value="set"
    />
    <UiInput
      v-else
      :id="id"
      :model-value="model[active] ?? ''"
      :maxlength="maxlength"
      @update:model-value="set"
    />
  </div>
</template>
