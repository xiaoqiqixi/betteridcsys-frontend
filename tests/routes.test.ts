import { describe, expect, it } from 'vitest'
import type { RouteRecordRaw } from 'vue-router'
import { routes } from '@/app/router/routes'

const flat = (rs: RouteRecordRaw[]): RouteRecordRaw[] => rs.flatMap((r) => [r, ...flat(r.children ?? [])])

describe('routes', () => {
  it('resolve every page component (missing pages throw at definition time)', () => {
    expect(flat(routes).length).toBeGreaterThan(40)
  })
  it('gate every admin page with a permission except the forbidden page', () => {
    const admin = routes.find((r) => r.path === '/admin')!
    for (const r of admin.children!)
      if (r.name !== 'admin-forbidden') expect(r.meta?.permission, String(r.name)).toBeTruthy()
  })
})
