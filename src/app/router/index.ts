import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import { useSession } from '@/shared/stores/session'
import { routes } from './routes'
import { enablePrivateMessages } from '@/shared/i18n'

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (to, _from, saved) => saved ?? (to.hash ? { el: to.hash, top: 72 } : { top: 0 }),
})

function access(to: RouteLocationNormalized) {
  // The deepest record that declares access wins (e.g. reset-password is public inside the guest layout).
  return [...to.matched].reverse().find((r) => r.meta.access)?.meta.access ?? 'public'
}

router.beforeEach(async (to) => {
  const session = useSession()
  try {
    await session.load()
  } catch {
    // Backend unreachable: public pages still render; private ones show their own error state.
    if (access(to) === 'public') return true
  }
  const user = session.user
  const need = access(to)

  if (need === 'guest' && user) return user.role === 'admin' ? '/admin' : '/dashboard'
  if ((need === 'client' || need === 'staff') && !user)
    return { name: 'login', query: { redirect: to.fullPath } }
  if (need === 'client' && user?.role === 'admin') return '/admin'
  if (need === 'staff' && user?.role !== 'admin') return '/dashboard'
  const permission = to.meta.permission
  if (permission && !session.can(permission)) return { name: 'admin-forbidden' }
  if (need === 'client' || need === 'staff') await enablePrivateMessages()
  return true
})
