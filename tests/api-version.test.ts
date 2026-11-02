import { expect, it } from 'vitest'
import { api } from '@/contract'
import { ApiClient, type TransportRequest } from '@/shared/api/client'

it('negotiates Core 0.6 for reads, CSRF bootstrap and writes', async () => {
  const requests: TransportRequest[] = []
  const client = new ApiClient(async (request) => {
    requests.push(request)
    return {
      status: 200,
      header: () => null,
      json: async () => ({ data: { user: null, csrf_token: 'csrf-test', demo_mode: false } }),
    }
  })
  await client.call(api.auth.login, { body: { email: 'client@example.test', password: 'example' } })
  await client.call(api.site.session)
  expect(requests.map((request) => request.method)).toEqual(['GET', 'POST', 'GET'])
  for (const request of requests) expect(request.headers['X-Aster-API-Version']).toBe('0.6')
})
