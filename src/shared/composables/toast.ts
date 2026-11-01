import { reactive } from 'vue'

export interface Toast {
  id: number
  tone: 'success' | 'error' | 'info'
  title: string
  description?: string
}

const state = reactive({ items: [] as Toast[] })
let seq = 0

function push(tone: Toast['tone'], title: string, description?: string, ms = 4200) {
  const id = ++seq
  state.items.push({ id, tone, title, description })
  if (state.items.length > 4) state.items.shift()
  setTimeout(() => dismiss(id), ms)
}
function dismiss(id: number) {
  const i = state.items.findIndex((t) => t.id === id)
  if (i >= 0) state.items.splice(i, 1)
}

export const toasts = state
export function useToast() {
  return {
    success: (title: string, description?: string) => push('success', title, description),
    error: (title: string, description?: string) => push('error', title, description, 6500),
    info: (title: string, description?: string) => push('info', title, description),
    dismiss,
  }
}
