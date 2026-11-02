import type { AnyEndpoint, CallInput, Result } from '@/contract'
import { resolvePath } from '@/contract/endpoint'
import { ApiError, SESSION_ENDING_CODES } from './errors'

export const API_BASE = '/api/v1'
const API_HEADERS = { Accept: 'application/json', 'X-Aster-API-Version': '0.6' }
const TIMEOUT_MS = 15_000
const REQUEST_ID = /^[A-Za-z0-9_-]{8,128}$/

export interface TransportRequest {
  method: string
  url: string
  headers: Record<string, string>
  body?: string
  signal: AbortSignal
}

export interface TransportResponse {
  status: number
  header(name: string): string | null
  json(): Promise<unknown>
}

export type Transport = (req: TransportRequest) => Promise<TransportResponse>

export const fetchTransport: Transport = async (req) => {
  const res = await fetch(req.url, {
    method: req.method,
    headers: req.headers,
    body: req.body ?? null,
    signal: req.signal,
    credentials: 'same-origin',
    cache: 'no-store',
    redirect: 'error',
  })
  return { status: res.status, header: (n) => res.headers.get(n), json: () => res.json() }
}

export interface ClientHooks {
  /** The server says this browser no longer has a valid session. */
  onSessionEnded?: (error: ApiError) => void
  /** Called after every successful session-shaped response so the store can follow it. */
  onCsrfToken?: (token: string) => void
}

function newKey(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return 'ui-' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function idempotencyKey(): string {
  return newKey()
}

function queryString(query: Record<string, unknown> | undefined): string {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue
    params.set(k, String(v))
  }
  const s = params.toString()
  return s ? `?${s}` : ''
}

export class ApiClient {
  private csrf = ''
  private csrfLoad: Promise<void> | null = null

  constructor(
    private readonly transport: Transport,
    private readonly hooks: ClientHooks = {},
  ) {}

  setCsrfToken(token: string) {
    this.csrf = token
  }

  private async ensureCsrf(signal: AbortSignal) {
    if (this.csrf) return
    this.csrfLoad ??= (async () => {
      const res = await this.transport({
        method: 'GET',
        url: `${API_BASE}/session`,
        headers: { ...API_HEADERS },
        signal,
      })
      const body = (await res.json()) as { data?: { csrf_token?: unknown } }
      if (typeof body?.data?.csrf_token === 'string') this.csrf = body.data.csrf_token
    })().finally(() => {
      this.csrfLoad = null
    })
    await this.csrfLoad
  }

  async call<E extends AnyEndpoint>(
    endpoint: E,
    input: CallInput<E> = {} as CallInput<E>,
  ): Promise<Result<E>> {
    const write = endpoint.method !== 'GET'
    const url =
      API_BASE +
      resolvePath(endpoint.path, input.params as Record<string, string> | undefined) +
      queryString(input.query as Record<string, unknown> | undefined)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), TIMEOUT_MS)
    const onAbort = () => controller.abort(input.signal?.reason)
    input.signal?.addEventListener('abort', onAbort, { once: true })

    const headers: Record<string, string> = { ...API_HEADERS }
    let body: string | undefined
    try {
      if (write) {
        await this.ensureCsrf(controller.signal)
        headers['X-CSRF-Token'] = this.csrf
        if (endpoint.body) {
          // Validate our own request against the contract before it leaves the browser.
          const parsed = endpoint.body.safeParse(input.body)
          if (!parsed.success)
            throw new ApiError('INVALID_REQUEST', 0, { details: { issues: parsed.error.issues } })
          body = JSON.stringify(parsed.data)
          headers['Content-Type'] = 'application/json'
        }
        if (endpoint.idempotent) headers['Idempotency-Key'] = input.idempotencyKey ?? newKey()
      }

      let res: TransportResponse
      try {
        res = await this.transport({ method: endpoint.method, url, headers, body, signal: controller.signal })
      } catch (e) {
        if (input.signal?.aborted) throw e
        const timeout =
          controller.signal.reason instanceof DOMException && controller.signal.reason.name === 'TimeoutError'
        throw new ApiError(timeout ? 'TIMEOUT' : 'NETWORK_ERROR', 0, { uncertain: write })
      }

      const headerId = res.header('X-Request-ID')
      let json: unknown
      try {
        json = await res.json()
      } catch {
        throw new ApiError(res.status >= 500 ? 'SERVICE_UNAVAILABLE' : 'INVALID_RESPONSE', res.status, {
          requestId: headerId && REQUEST_ID.test(headerId) ? headerId : undefined,
          uncertain: write && (res.status >= 500 || res.status < 400),
        })
      }

      if (res.status < 200 || res.status >= 300) {
        const err = (json as { error?: Record<string, unknown> })?.error ?? {}
        const code =
          typeof err.code === 'string' && /^[A-Z][A-Z0-9_]{0,95}$/.test(err.code)
            ? err.code
            : 'REQUEST_FAILED'
        const reqId = headerId ?? (typeof err.request_id === 'string' ? err.request_id : null)
        const retry = Number(res.header('Retry-After'))
        const failure = new ApiError(code, res.status, {
          message: typeof err.message === 'string' ? err.message : code,
          requestId: reqId && REQUEST_ID.test(reqId) ? reqId : undefined,
          details:
            err.details && typeof err.details === 'object'
              ? (err.details as Record<string, unknown>)
              : undefined,
          uncertain: write && res.status >= 500,
          retryAfter: Number.isFinite(retry) && retry > 0 ? retry : undefined,
        })
        if (SESSION_ENDING_CODES.has(code) || (res.status === 401 && code !== 'INVALID_CREDENTIALS')) {
          this.csrf = ''
          this.hooks.onSessionEnded?.(failure)
        }
        throw failure
      }

      if (!json || typeof json !== 'object' || !Object.hasOwn(json, 'data')) {
        throw new ApiError('INVALID_RESPONSE', res.status, { uncertain: write })
      }
      const parsed = endpoint.response.safeParse((json as { data: unknown }).data)
      if (!parsed.success) {
        if (import.meta.env.DEV)
          console.error(`[contract] ${endpoint.id} response mismatch`, parsed.error.issues)
        throw new ApiError('INVALID_RESPONSE', res.status, { uncertain: write })
      }
      const data = parsed.data as Result<E>
      const token = (data as { csrf_token?: unknown } | null)?.csrf_token
      if (typeof token === 'string') {
        this.csrf = token
        this.hooks.onCsrfToken?.(token)
      }
      const nested = (data as { session?: { csrf_token?: unknown } } | null)?.session?.csrf_token
      if (typeof nested === 'string') {
        this.csrf = nested
        this.hooks.onCsrfToken?.(nested)
      }
      return data
    } finally {
      clearTimeout(timer)
      input.signal?.removeEventListener('abort', onAbort)
    }
  }
}
