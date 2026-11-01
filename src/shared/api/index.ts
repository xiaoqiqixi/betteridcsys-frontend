import { ApiClient, type ClientHooks, type Transport } from './client'

let instance: ApiClient | null = null

export function createApi(transport: Transport, hooks: ClientHooks): ApiClient {
  instance = new ApiClient(transport, hooks)
  return instance
}

/** The process-wide client. Created once in main.ts before the app mounts. */
export function api(): ApiClient {
  if (!instance) throw new Error('API client used before createApi()')
  return instance
}

export { ApiClient, fetchTransport, idempotencyKey } from './client'
export type { Transport, TransportRequest, TransportResponse } from './client'
export { ApiError, isApiError } from './errors'
