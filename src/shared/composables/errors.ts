import { useI18n } from 'vue-i18n'
import { isApiError } from '@/shared/api/errors'

/** Translate any thrown value into user-facing copy. Unknown codes fall back to the server message. */
export function useErrorText() {
  const { t, te } = useI18n()
  function describe(e: unknown): { title: string; message: string; requestId?: string; uncertain: boolean } {
    if (isApiError(e)) {
      const key = `errors.${e.code}`
      const message = te(key)
        ? t(key)
        : e.status >= 500 || e.status === 0
          ? t('errors.generic')
          : e.message || t('errors.generic')
      return {
        title: e.uncertain ? t('errors.uncertainTitle') : t('errors.title'),
        message: e.uncertain ? t('errors.uncertain') : message,
        requestId: e.requestId,
        uncertain: e.uncertain,
      }
    }
    return { title: t('errors.title'), message: t('errors.generic'), uncertain: false }
  }
  function text(e: unknown) {
    return describe(e).message
  }
  function field(e: unknown, name: string): string | null {
    return isApiError(e) ? (e.fields[name] ?? null) : null
  }
  return { describe, text, field }
}
