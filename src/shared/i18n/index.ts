import { createI18n } from 'vue-i18n'
import type { Locale } from '@/contract'
import en from './en'
import zh from './zh-CN'

export type MessageSchema = typeof en

export const SUPPORTED_LOCALES: Locale[] = ['zh-CN', 'en']

export function detectLocale(stored: Locale | null, siteDefault?: Locale): Locale {
  if (stored && SUPPORTED_LOCALES.includes(stored)) return stored
  const nav = typeof navigator !== 'undefined' ? (navigator.languages ?? [navigator.language]) : []
  for (const l of nav) {
    if (/^zh\b/i.test(l)) return 'zh-CN'
    if (/^en\b/i.test(l)) return 'en'
  }
  return siteDefault ?? 'zh-CN'
}

export const i18n = createI18n<[MessageSchema], Locale, false>({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'en',
  messages: { en, 'zh-CN': zh },
  missingWarn: import.meta.env.DEV,
  fallbackWarn: false,
})

export function setLocale(locale: Locale) {
  i18n.global.locale.value = locale
  document.documentElement.lang = locale === 'zh-CN' ? 'zh-CN' : 'en'
}
