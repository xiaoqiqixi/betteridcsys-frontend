import { reactive } from 'vue'

export interface ConfirmOptions {
  title: string
  body?: string
  confirmLabel?: string
  tone?: 'primary' | 'danger'
  /** When set, the user must type this exact text to enable the confirm button. */
  typed?: string
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void
}

export const confirmState = reactive({ current: null as Pending | null })

/** Promise-based confirmation rendered by <ConfirmHost/> in the app shell. */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  confirmState.current?.resolve(false)
  return new Promise((resolve) => {
    confirmState.current = { ...options, resolve }
  })
}
