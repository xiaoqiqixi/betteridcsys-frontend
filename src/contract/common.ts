import { z } from 'zod'

/**
 * Shared primitives of the finance API contract (`/api/v1`, Core 0.6).
 *
 * The backend wraps every success body as `{ "data": ... }` and every failure as
 * `{ "error": { code, message, request_id, details? } }`. Schemas in this folder describe
 * the `data` member only; the transport unwraps the envelope.
 */

/** Largest integer that survives a JSON round trip in every client. Matches backend MaxMinor. */
export const MAX_MINOR = 9_007_199_254_740_991

export const Id = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,64}$/)
  .meta({ id: 'Id', description: 'Opaque identifier. Never parse or order by it.' })

export const Timestamp = z.iso.datetime({ offset: true }).meta({ id: 'Timestamp' })
export const DateOnly = z.iso.date().meta({ id: 'Date' })

export const Locale = z.enum(['zh-CN', 'en']).meta({ id: 'Locale' })
export type Locale = z.infer<typeof Locale>

export const CurrencyCode = z
  .string()
  .regex(/^[A-Z]{3}$/)
  .meta({ id: 'CurrencyCode', description: 'ISO 4217 code.' })

export const MinorAmount = z.int().min(-MAX_MINOR).max(MAX_MINOR)

/**
 * Exact money value. `amount_minor` is an integer count of the currency's smallest unit;
 * `decimal_places` is the precision snapshot that was in force when the value was recorded,
 * so historical documents keep rendering correctly after a currency registry change.
 */
export const Money = z
  .object({
    currency: CurrencyCode,
    amount_minor: MinorAmount,
    decimal_places: z.int().min(0).max(6),
  })
  .meta({ id: 'Money' })
export type Money = z.infer<typeof Money>

/** Display text in one or more locales. Clients fall back to the site default locale. */
export const LocalizedText = z
  .partialRecord(Locale, z.string().max(4000))
  .refine((v) => Object.values(v).some((s) => s && s.trim().length > 0), 'at least one locale is required')
  .meta({ id: 'LocalizedText' })
export type LocalizedText = z.infer<typeof LocalizedText>

export const Email = z.email().max(254)

export const Country = z
  .string()
  .regex(/^[A-Z]{2}$/)
  .meta({ id: 'Country', description: 'ISO 3166-1 alpha-2.' })

/** Optimistic concurrency token. Updates must echo the revision they were based on. */
export const Revision = z.int().min(0).meta({ id: 'Revision' })

export const BillingCycle = z
  .enum(['monthly', 'quarterly', 'semiannually', 'annually', 'biennially', 'triennially', 'one_time'])
  .meta({ id: 'BillingCycle' })
export type BillingCycle = z.infer<typeof BillingCycle>

export const CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  semiannually: 6,
  annually: 12,
  biennially: 24,
  triennially: 36,
  one_time: 0,
}

export const PageQuery = z.object({
  cursor: z.string().max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

/** Cursor pagination. `total` is optional because exact counts can be expensive. */
export function page<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    next_cursor: z.string().nullable(),
    total: z.int().min(0).optional(),
  })
}
export type Page<T> = { items: T[]; next_cursor: string | null; total?: number }

export const ErrorBody = z
  .object({
    error: z.object({
      code: z.string().regex(/^[A-Z][A-Z0-9_]{0,95}$/),
      message: z.string(),
      request_id: z.string().optional(),
      details: z.record(z.string(), z.unknown()).optional(),
    }),
  })
  .meta({ id: 'Error' })

/** Long-running work on a resource (power actions, provisioning, reinstall...). */
export const TaskStatus = z
  .enum(['queued', 'running', 'succeeded', 'failed', 'uncertain'])
  .meta({ id: 'TaskStatus', description: '`uncertain` is never retried automatically.' })

export const Empty = z.object({})
