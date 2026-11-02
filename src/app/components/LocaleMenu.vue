<script setup lang="ts">
import { Languages } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Locale } from '@/contract'
import { useSite } from '@/shared/composables/site'
import { setLocale } from '@/shared/i18n'
import { usePrefs } from '@/shared/stores/prefs'
import { useSession } from '@/shared/stores/session'
import UiDropdown from '@/shared/ui/UiDropdown.vue'

withDefaults(defineProps<{ showCurrency?: boolean }>(), { showCurrency: true })
const { t, locale } = useI18n()
const prefs = usePrefs()
const site = useSite()
const session = useSession()
const names: Record<Locale, string> = { 'zh-CN': '简体中文', en: 'English' }

const items = computed(() => {
  const list: { label: string; heading?: boolean; separator?: boolean; onSelect?: () => void }[] = [
    { label: t('common.language'), heading: true },
  ]
  for (const l of Object.keys(names) as Locale[]) {
    list.push({
      label: names[l] + (locale.value === l ? ' ✓' : ''),
      onSelect: () => {
        prefs.locale = l
        setLocale(l)
      },
    })
  }
  if (!session.isClient && site.enabledCurrencies.value.length > 1) {
    list.push({ label: '', separator: true }, { label: t('common.currency'), heading: true })
    for (const c of site.enabledCurrencies.value) {
      list.push({
        label: `${c.code} · ${c.name}` + (site.currency.value === c.code ? ' ✓' : ''),
        onSelect: () => (prefs.currency = c.code),
      })
    }
  }
  return list
})
</script>

<template>
  <UiDropdown :items="items" width="w-48">
    <button
      :aria-label="$t('common.language')"
      class="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-fg"
    >
      <Languages class="size-4" />
      <span class="hidden sm:inline">{{ locale === 'zh-CN' ? '中文' : 'EN' }}</span>
      <span v-if="showCurrency && !session.isClient" class="hidden text-faint sm:inline"
        >/ {{ site.currency.value }}</span
      >
    </button>
  </UiDropdown>
</template>
