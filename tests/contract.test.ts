import { describe, expect, it } from 'vitest'
import { api, type AnyEndpoint } from '@/contract/admin-endpoints'

const all: AnyEndpoint[] = Object.values(api).flatMap((g) => Object.values(g) as AnyEndpoint[])

describe('endpoint registry', () => {
  it('has unique operation ids and method+path pairs', () => {
    const ids = all.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    const routes = all.map((e) => `${e.method} ${e.path}`)
    expect(new Set(routes).size).toBe(routes.length)
  })
  it('protects every admin route with a permission', () => {
    for (const e of all.filter((x) => x.path.startsWith('/admin'))) {
      expect(e.access, e.id).toBe('staff')
      expect(e.permission, e.id).toBeTruthy()
    }
  })
  it('never sends a body on GET or DELETE', () => {
    for (const e of all.filter((x) => x.method === 'GET' || x.method === 'DELETE'))
      expect(e.body, e.id).toBeUndefined()
  })
})
