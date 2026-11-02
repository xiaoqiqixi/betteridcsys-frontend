import { createI18n } from 'vue-i18n'
import type { Locale } from '@/contract'
import type en from './en'
import type privateEn from './en-private'

export type MessageSchema = typeof en & typeof privateEn

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
  missingWarn: import.meta.env.DEV,
  fallbackWarn: false,
})

const loaders = {
  en: () => import('./en'),
  'zh-CN': () => import('./zh-CN'),
}
const loaded = new Map<Locale, Promise<void>>()
let requested: Locale = 'zh-CN'

export async function setLocale(locale: Locale) {
  requested = locale
  if (!loaded.has(locale)) {
    loaded.set(
      locale,
      loaders[locale]()
        .then(({ default: messages }) => {
          i18n.global.mergeLocaleMessage(locale, messages)
        })
        .catch((error: unknown) => {
          loaded.delete(locale)
          throw error
        }),
    )
  }
  await loaded.get(locale)
  if (privateEnabled) await loadPrivate(locale)
  // A slow language download must not override a newer selection.
  if (requested !== locale) return
  i18n.global.locale.value = locale
  document.documentElement.lang = locale === 'zh-CN' ? 'zh-CN' : 'en'
}

const privateLoaders = {
  en: () => import('./en-private'),
  'zh-CN': () => import('./zh-CN-private'),
}
let privateEnabled = false
const privateLoaded = new Map<Locale, Promise<void>>()
function loadPrivate(locale: Locale) {
  if (!privateLoaded.has(locale)) {
    privateLoaded.set(
      locale,
      privateLoaders[locale]()
        .then(({ default: messages }) => {
          i18n.global.mergeLocaleMessage(locale, messages)
        })
        .catch((error: unknown) => {
          privateLoaded.delete(locale)
          throw error
        }),
    )
  }
  return privateLoaded.get(locale)!
}
export async function enablePrivateMessages() {
  privateEnabled = true
  await Promise.all([loadPrivate(i18n.global.locale.value), loadPrivate(requested)])
}
