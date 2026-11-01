<script setup lang="ts">
import { Monitor, Moon, Sun } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePrefs, type ThemePreference } from '@/shared/stores/prefs'
import UiDropdown from '@/shared/ui/UiDropdown.vue'

const prefs = usePrefs()
const { t } = useI18n()
const icon = computed(() => (prefs.theme === 'system' ? Monitor : prefs.dark ? Moon : Sun))
const items = computed(() =>
  (['light', 'dark', 'system'] as ThemePreference[]).map((v) => ({
    label: t(`theme.${v}`) + (prefs.theme === v ? ' ✓' : ''),
    icon: v === 'light' ? Sun : v === 'dark' ? Moon : Monitor,
    onSelect: () => (prefs.theme = v),
  })),
)
</script>

<template>
  <UiDropdown :items="items" width="w-40">
    <button
      class="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      :aria-label="$t('theme.label')"
    >
      <component :is="icon" class="size-4" />
    </button>
  </UiDropdown>
</template>
