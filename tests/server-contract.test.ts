import { describe, expect, it } from 'vitest'
import { ManualServiceInfo } from '@/contract/admin'
import { api } from '@/contract/admin-endpoints'
import { ModuleSchema, ProductModule, ServerConnectionPatch } from '@/contract/server'

describe('server module contract', () => {
  it('validates staff delivery addresses for manual services', () => {
    expect(
      ManualServiceInfo.safeParse({ hostname: 'service.example', ipv4: ['192.0.2.1'], ipv6: ['2001:db8::1'] })
        .success,
    ).toBe(true)
    expect(ManualServiceInfo.safeParse({ hostname: '', ipv4: ['not-an-ip'], ipv6: [] }).success).toBe(false)
    expect(ManualServiceInfo.safeParse({ hostname: '', ipv4: [], ipv6: ['192.0.2.1'] }).success).toBe(false)
  })
  it('accepts flat module fields and rejects unsupported nested objects', () => {
    expect(
      ModuleSchema.safeParse({
        type: 'object',
        additionalProperties: false,
        properties: {
          region: { type: 'string', enum: ['eu', 'asia'], 'x-i18n': { en: { title: 'Region' } } },
          backups: { type: 'boolean' },
          features: { type: 'array', items: { type: 'string', enum: ['ipv6', 'snapshot'] } },
        },
      }).success,
    ).toBe(true)
    expect(
      ModuleSchema.safeParse({
        type: 'object',
        additionalProperties: false,
        properties: {
          nested: { type: 'object', properties: {} },
        },
      }).success,
    ).toBe(false)
  })
  it('requires an explicit module, connection and revision for updates', () => {
    expect(
      ProductModule.safeParse({ module_id: 'server.aster-cloud', connection_id: 'east', config: {} }).success,
    ).toBe(true)
    expect(
      ProductModule.safeParse({ module_id: 'resource.cloud', connection_id: 'east', config: {} }).success,
    ).toBe(false)
    expect(ServerConnectionPatch.safeParse({ enabled: false }).success).toBe(false)
  })
  it('protects custom actions with idempotency and removes the controller API', () => {
    expect(api.services.action.idempotent).toBe(true)
    expect(api.services.action.path).toBe('/services/{id}/actions/{action_id}')
    expect(Object.values(api.admin).some((e) => /\/(controllers|groups)/.test(e.path))).toBe(false)
  })
})
