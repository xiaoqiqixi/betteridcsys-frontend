import { describe, expect, it, vi } from 'vitest'
import { api } from '@/contract/admin-endpoints'
import { ApiClient, type TransportRequest, type TransportResponse } from '@/shared/api/client'
import { ApiError } from '@/shared/api/errors'

const session = { user: null, csrf_token: 'csrf-1', demo_mode: false }
function reply(status: number, body: unknown, headers: Record<string, string> = {}): TransportResponse {
  return { status, header: (n) => headers[n] ?? null, json: async () => body }
}

describe('ApiClient', () => {
  it('fetches a CSRF token before the first write and sends idempotency keys', async () => {
    const seen: TransportRequest[] = []
    const client = new ApiClient(async (req) => {
      seen.push(req)
      if (req.url.endsWith('/session')) return reply(200, { data: session })
      return reply(200, { data: { recovery: true } })
    })
    await expect(client.call(api.billing.topUp, { body: { amount_minor: 500 } })).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      uncertain: true,
    })
    expect(seen[0]!.url).toBe('/api/v1/session')
    expect(seen[1]!.headers['X-CSRF-Token']).toBe('csrf-1')
    expect(seen[1]!.headers['Idempotency-Key']).toMatch(/^ui-[0-9a-f]{32}$/)
    expect(JSON.parse(seen[1]!.body!)).toEqual({ amount_minor: 500 })
  })

  it('unwraps the data envelope and validates against the contract', async () => {
    const client = new ApiClient(async () => reply(200, { data: session }))
    await expect(client.call(api.site.session)).resolves.toEqual(session)
  })

  it('validates request bodies before sending', async () => {
    const transport = vi.fn(async () => reply(200, { data: session }))
    const client = new ApiClient(transport)
    client.setCsrfToken('x')
    await expect(client.call(api.billing.topUp, { body: { amount_minor: -1 } })).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
    })
    expect(transport).not.toHaveBeenCalled()
  })

  it('marks failed writes after sending as uncertain, but not reads', async () => {
    const client = new ApiClient(async () =>
      reply(503, { error: { code: 'SERVICE_UNAVAILABLE', message: 'x' } }),
    )
    client.setCsrfToken('x')
    await expect(
      client.call(api.orders.cancel, { params: { id: 'o1' }, body: { reason: 'r' } }),
    ).rejects.toMatchObject({ uncertain: true })
    await expect(client.call(api.site.currencies)).rejects.toMatchObject({ uncertain: false, status: 503 })
  })

  it('treats network failures on writes as uncertain', async () => {
    const client = new ApiClient(async () => {
      throw new TypeError('Failed to fetch')
    })
    client.setCsrfToken('x')
    const err = (await client
      .call(api.support.close, { params: { id: 't1' }, body: {} })
      .catch((e) => e)) as ApiError
    expect(err.code).toBe('NETWORK_ERROR')
    expect(err.uncertain).toBe(true)
  })

  it('reports ended sessions', async () => {
    const ended = vi.fn()
    const client = new ApiClient(async () => reply(401, { error: { code: 'AUTH_REQUIRED', message: 'x' } }), {
      onSessionEnded: ended,
    })
    await expect(client.call(api.account.profile)).rejects.toBeInstanceOf(ApiError)
    expect(ended).toHaveBeenCalledOnce()
  })

  it('does not end the session on wrong credentials', async () => {
    const ended = vi.fn()
    const client = new ApiClient(
      async () => reply(401, { error: { code: 'INVALID_CREDENTIALS', message: 'x' } }),
      { onSessionEnded: ended },
    )
    client.setCsrfToken('x')
    await expect(
      client.call(api.auth.login, { body: { email: 'a@b.co', password: 'x' } }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    expect(ended).not.toHaveBeenCalled()
  })

  it('percent-encodes path parameters and rejects traversal', async () => {
    const urls: string[] = []
    const client = new ApiClient(async (req) => {
      urls.push(req.url)
      return reply(404, { error: { code: 'NOT_FOUND', message: 'x' } })
    })
    await client.call(api.orders.get, { params: { id: 'a b' } }).catch(() => undefined)
    expect(urls[0]).toBe('/api/v1/orders/a%20b')
    await expect(client.call(api.orders.get, { params: { id: '..' } })).rejects.toThrow(TypeError)
  })
})
