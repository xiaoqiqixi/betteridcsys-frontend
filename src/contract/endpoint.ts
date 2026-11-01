import type { z } from 'zod'
import type { Permission } from './identity'

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'
export type Access = 'public' | 'client' | 'staff'

/**
 * One operation of the finance API. The registry built from these definitions is the
 * single source of truth: the UI calls through it (with runtime response validation),
 * `npm run contract` exports it as OpenAPI for the
 * Go backend.
 */
export interface Endpoint<
  P extends string = string,
  Q extends z.ZodType | undefined = z.ZodType | undefined,
  B extends z.ZodType | undefined = z.ZodType | undefined,
  R extends z.ZodType = z.ZodType,
> {
  id: string
  method: HttpMethod
  path: P
  access: Access
  /** Staff permission checked by the backend. Required when access is `staff`. */
  permission?: Permission
  tag: string
  summary: string
  query?: Q
  body?: B
  response: R
  /** Requires an `Idempotency-Key`; replays return the first result. */
  idempotent?: boolean
}

export function endpoint<
  const P extends string,
  Q extends z.ZodType | undefined = undefined,
  B extends z.ZodType | undefined = undefined,
  R extends z.ZodType = z.ZodType,
>(def: Endpoint<P, Q, B, R>): Endpoint<P, Q, B, R> {
  return def
}

type ParamNames<P extends string> = P extends `${string}{${infer K}}${infer Rest}`
  ? K | ParamNames<Rest>
  : never

export type AnyEndpoint = Endpoint<string, z.ZodType | undefined, z.ZodType | undefined, z.ZodType>

type QueryOf<E> = E extends Endpoint<string, infer Q, z.ZodType | undefined, z.ZodType> ? Q : undefined
type BodyOf<E> = E extends Endpoint<string, z.ZodType | undefined, infer B, z.ZodType> ? B : undefined

export type CallInput<E extends AnyEndpoint> = ([ParamNames<E['path']>] extends [never]
  ? { params?: never }
  : { params: Record<ParamNames<E['path']>, string> }) &
  ([QueryOf<E>] extends [z.ZodType] ? { query?: z.input<QueryOf<E>> } : { query?: never }) &
  ([BodyOf<E>] extends [z.ZodType] ? { body: z.input<BodyOf<E>> } : { body?: never }) & {
    idempotencyKey?: string
    signal?: AbortSignal
  }

export type Result<E extends AnyEndpoint> = z.output<E['response']>

/** Fill `{name}` placeholders, percent-encoding every segment. */
export function resolvePath(path: string, params: Record<string, string> | undefined): string {
  return path.replace(/\{([a-z_]+)\}/g, (_, name: string) => {
    const value = params?.[name]
    if (typeof value !== 'string' || value === '' || value === '.' || value === '..') {
      throw new TypeError(`missing path parameter ${name}`)
    }
    return encodeURIComponent(value)
  })
}
