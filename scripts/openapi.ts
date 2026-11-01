import { z } from 'zod'
import { api, type AnyEndpoint } from '../src/contract'

/**
 * Export the endpoint registry as OpenAPI 3.1. The Go backend implements this document;
 * `tests/openapi.test.ts` fails when the committed copy is stale.
 */

type Json = Record<string, unknown>
const REF = '#/components/schemas/'

function rewrite(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(rewrite)
  if (!node || typeof node !== 'object') return node
  const out: Json = {}
  for (const [k, v] of Object.entries(node as Json)) {
    if (k === '$ref' && typeof v === 'string' && v.startsWith('#/$defs/'))
      out[k] = REF + v.slice('#/$defs/'.length)
    else if (k !== '$schema') out[k] = rewrite(v)
  }
  return out
}

function convert(schema: z.ZodType, io: 'input' | 'output', components: Json): Json {
  const raw = z.toJSONSchema(schema, {
    target: 'draft-2020-12',
    io,
    unrepresentable: 'any',
    reused: 'inline',
  }) as Json
  const defs = (raw.$defs ?? {}) as Json
  delete raw.$defs
  for (const [name, def] of Object.entries(defs)) {
    const key =
      io === 'input' && components[name] && JSON.stringify(components[name]) !== JSON.stringify(rewrite(def))
        ? `${name}Input`
        : name
    components[key] = rewrite(def)
  }
  const root = rewrite(raw) as Json
  if (typeof root.id === 'string') {
    const name = root.id
    delete root.id
    components[name] ??= root
    return { $ref: REF + name }
  }
  return root
}

function list(): AnyEndpoint[] {
  const out: AnyEndpoint[] = []
  for (const group of Object.values(api)) for (const e of Object.values(group)) out.push(e as AnyEndpoint)
  return out
}

export function buildOpenApi(version: string) {
  const components: Json = {}
  const paths: Record<string, Json> = {}
  for (const e of list()) {
    const params: Json[] = []
    for (const m of e.path.matchAll(/\{([a-z_]+)\}/g)) {
      params.push({
        name: m[1],
        in: 'path',
        required: true,
        schema: { type: 'string', pattern: '^[A-Za-z0-9_-]{1,64}$' },
      })
    }
    if (e.query) {
      const q = convert(e.query, 'input', components)
      const props = (q.properties ?? {}) as Json
      const required = new Set((q.required as string[] | undefined) ?? [])
      for (const [name, schema] of Object.entries(props))
        params.push({ name, in: 'query', required: required.has(name), schema })
    }
    const op: Json = {
      operationId: e.id,
      summary: e.summary,
      tags: [e.tag],
      'x-access': e.access,
      ...(e.permission ? { 'x-permission': e.permission } : {}),
      ...(e.idempotent ? { 'x-idempotent': true } : {}),
      ...(params.length ? { parameters: params } : {}),
      security: e.access === 'public' ? [{}] : [{ session: [] }],
      responses: {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['data'],
                properties: { data: convert(e.response, 'output', components) },
              },
            },
          },
        },
        default: {
          description: 'Error',
          content: { 'application/json': { schema: { $ref: REF + 'Error' } } },
        },
      },
    }
    if (e.body) {
      op.requestBody = {
        required: true,
        content: { 'application/json': { schema: convert(e.body, 'input', components) } },
      }
    }
    if (e.method !== 'GET') {
      const headers: Json[] = [
        { name: 'X-CSRF-Token', in: 'header', required: true, schema: { type: 'string' } },
      ]
      if (e.idempotent)
        headers.push({
          name: 'Idempotency-Key',
          in: 'header',
          required: true,
          schema: { type: 'string', minLength: 8, maxLength: 128 },
        })
      op.parameters = [...((op.parameters as Json[]) ?? []), ...headers]
    }
    ;(paths[e.path] ??= {})[e.method.toLowerCase()] = op
  }
  convert(
    z
      .object({
        error: z.object({
          code: z.string(),
          message: z.string(),
          request_id: z.string().optional(),
          details: z.record(z.string(), z.unknown()).optional(),
        }),
      })
      .meta({ id: 'Error' }),
    'output',
    components,
  )
  const sorted = Object.fromEntries(Object.entries(components).sort(([a], [b]) => a.localeCompare(b)))
  return {
    openapi: '3.1.0',
    info: {
      title: '星屿云 Finance API',
      version,
      description:
        'Same-origin JSON API. Success bodies are `{ "data": ... }`, failures `{ "error": { code, message, request_id } }`. ' +
        'Writes need `X-CSRF-Token`; operations marked x-idempotent need an `Idempotency-Key` and replay the first result. ' +
        'Money is integer minor units. Staff endpoints check `x-permission` on every request.',
    },
    servers: [{ url: '/api/v1' }],
    paths: Object.fromEntries(Object.entries(paths).sort(([a], [b]) => a.localeCompare(b))),
    components: {
      schemas: sorted,
      securitySchemes: { session: { type: 'apiKey', in: 'cookie', name: '__Host-aster_session' } },
    },
  }
}
