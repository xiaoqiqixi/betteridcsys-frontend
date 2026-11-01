/**
 * Every failure the UI can see. `uncertain` means a write may or may not have taken
 * effect (timeout, network loss, 5xx after sending): the UI must not resubmit with a new
 * idempotency key and must ask the user to re-read the resource instead.
 */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly requestId: string | undefined
  readonly details: Record<string, unknown> | undefined
  readonly uncertain: boolean
  readonly retryAfter: number | undefined

  constructor(
    code: string,
    status: number,
    init: {
      message?: string
      requestId?: string | undefined
      details?: Record<string, unknown> | undefined
      uncertain?: boolean
      retryAfter?: number | undefined
    } = {},
  ) {
    super(init.message ?? code)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.requestId = init.requestId
    this.details = init.details
    this.uncertain = init.uncertain ?? false
    this.retryAfter = init.retryAfter
  }

  /** Field-level validation messages keyed by request field, when the backend sends them. */
  get fields(): Record<string, string> {
    const f = this.details?.fields
    if (!f || typeof f !== 'object') return {}
    return Object.fromEntries(Object.entries(f).filter(([, v]) => typeof v === 'string')) as Record<
      string,
      string
    >
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

export const SESSION_ENDING_CODES = new Set(['AUTH_REQUIRED', 'CSRF_INVALID', 'SESSION_EXPIRED'])
