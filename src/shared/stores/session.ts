import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api as endpoints } from '@/contract'
import type { Permission, Session, SessionUser } from '@/contract/identity'
import { api } from '@/shared/api'
import { queryClient } from '@/shared/api/query-client'

export const useSession = defineStore('session', () => {
  const user = ref<SessionUser | null>(null)
  const demo = ref(false)
  const ready = ref(false)
  let loading: Promise<void> | null = null

  function apply(s: Session) {
    user.value = s.user
    demo.value = s.demo_mode
    api().setCsrfToken(s.csrf_token)
    ready.value = true
  }

  function load(force = false): Promise<void> {
    if (ready.value && !force) return Promise.resolve()
    loading ??= api()
      .call(endpoints.site.session)
      .then(apply)
      .finally(() => {
        loading = null
      })
    return loading
  }

  /** The server ended our session (expired, revoked, CSRF reset). */
  function ended() {
    user.value = null
  }

  async function logout() {
    try {
      apply(await api().call(endpoints.auth.logout, { body: {} }))
    } finally {
      user.value = null
      queryClient.clear()
    }
  }

  const isStaff = computed(() => user.value?.role === 'admin')
  const isClient = computed(() => user.value?.role === 'customer')
  const can = (p: Permission) => isStaff.value && (user.value?.permissions?.includes(p) ?? false)

  return { user, demo, ready, load, apply, ended, logout, isStaff, isClient, can }
})
