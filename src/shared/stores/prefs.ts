import { usePreferredDark, useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, watchEffect } from 'vue'
import type { Locale } from '@/contract'

export type ThemePreference = 'system' | 'light' | 'dark'

export const PREFS_KEY = 'bis.prefs.v1'

interface Stored {
  theme: ThemePreference
  locale: Locale | null
  /** Browsing currency for visitors; signed-in clients always use their account currency. */
  currency: string | null
  sidebarCollapsed: boolean
}

export const usePrefs = defineStore('prefs', () => {
  const stored = useStorage<Stored>(
    PREFS_KEY,
    { theme: 'system', locale: null, currency: null, sidebarCollapsed: false },
    localStorage,
    { mergeDefaults: true },
  )
  const systemDark = usePreferredDark()
  const dark = computed(
    () => stored.value.theme === 'dark' || (stored.value.theme === 'system' && systemDark.value),
  )

  watchEffect(() => {
    document.documentElement.classList.toggle('dark', dark.value)
  })

  function setAccent(accent: string) {
    document.documentElement.dataset.accent = accent
  }

  return {
    theme: computed({ get: () => stored.value.theme, set: (v) => (stored.value.theme = v) }),
    locale: computed({ get: () => stored.value.locale, set: (v) => (stored.value.locale = v) }),
    currency: computed({ get: () => stored.value.currency, set: (v) => (stored.value.currency = v) }),
    sidebarCollapsed: computed({
      get: () => stored.value.sidebarCollapsed,
      set: (v) => (stored.value.sidebarCollapsed = v),
    }),
    dark,
    setAccent,
  }
})
