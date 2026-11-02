import { z } from 'zod'
import { Id, LocalizedText, Revision, Timestamp } from './common'

export const ModuleId = z.string().regex(/^server\.[a-z][a-z0-9-]{0,47}$/)
export const SchemaScalar = z.union([z.string().max(4000), z.number().finite(), z.boolean()])
export const ModuleFields = z.record(
  z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/),
  z.union([SchemaScalar, z.array(SchemaScalar).max(100)]),
)
export type ModuleFields = z.infer<typeof ModuleFields>

const fieldText = {
  title: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  'x-i18n': z
    .partialRecord(
      z.enum(['zh-CN', 'en']),
      z.object({ title: z.string().max(200).optional(), description: z.string().max(2000).optional() }),
    )
    .optional(),
}
const scalarType = z.enum(['string', 'integer', 'number', 'boolean'])
export const SchemaField = z
  .discriminatedUnion('type', [
    z.object({
      ...fieldText,
      type: z.literal('string'),
      enum: z.array(z.string()).min(1).max(100).optional(),
      minLength: z.int().min(0).optional(),
      maxLength: z.int().min(0).max(4000).optional(),
      default: z.string().optional(),
      writeOnly: z.boolean().optional(),
    }),
    z.object({
      ...fieldText,
      type: z.literal('integer'),
      enum: z.array(z.int()).min(1).max(100).optional(),
      minimum: z.number().optional(),
      maximum: z.number().optional(),
      default: z.int().optional(),
    }),
    z.object({
      ...fieldText,
      type: z.literal('number'),
      enum: z.array(z.number()).min(1).max(100).optional(),
      minimum: z.number().optional(),
      maximum: z.number().optional(),
      default: z.number().optional(),
    }),
    z.object({
      ...fieldText,
      type: z.literal('boolean'),
      enum: z.array(z.boolean()).min(1).max(2).optional(),
      default: z.boolean().optional(),
    }),
    z.object({
      ...fieldText,
      type: z.literal('array'),
      items: z.object({ type: scalarType, enum: z.array(SchemaScalar).min(1).max(100) }),
      minItems: z.int().min(0).optional(),
      maxItems: z.int().min(0).max(100).optional(),
      uniqueItems: z.literal(true).optional(),
      default: z.array(SchemaScalar).max(100).optional(),
    }),
  ])
  .meta({ id: 'SchemaField' })
export type SchemaField = z.infer<typeof SchemaField>

/** Flat JSON Schema subset shared by module product, order and action forms. */
export const ModuleSchema = z
  .object({
    type: z.literal('object'),
    properties: z.record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/), SchemaField),
    required: z.array(z.string()).max(100).optional(),
    additionalProperties: z.literal(false),
  })
  .meta({ id: 'ModuleSchema' })
export type ModuleSchema = z.infer<typeof ModuleSchema>

export const ServerCustomAction = z
  .object({
    id: Id,
    name: LocalizedText,
    danger: z.boolean(),
    confirm: LocalizedText.nullable(),
    input_schema: ModuleSchema,
  })
  .meta({ id: 'ServerCustomAction' })
export type ServerCustomAction = z.infer<typeof ServerCustomAction>

export const ServerModule = z
  .object({
    id: ModuleId,
    name: LocalizedText,
    version: z.string().min(1).max(64),
    status: z.enum(['ready', 'stopped', 'misconfigured', 'incompatible']),
    capabilities: z.array(z.string().regex(/^[a-z][a-z0-9_]{0,63}$/)),
    product_schema: ModuleSchema,
    order_schema: ModuleSchema,
    custom_actions: z.array(ServerCustomAction),
  })
  .meta({ id: 'ServerModule' })
export type ServerModule = z.infer<typeof ServerModule>

export const ServerConnection = z
  .object({
    id: Id,
    module_id: ModuleId,
    name: z.string().min(1).max(80),
    enabled: z.boolean(),
    status: z.enum(['healthy', 'degraded', 'unreachable', 'unconfigured']),
    service_count: z.int().min(0),
    last_checked_at: Timestamp.nullable(),
    revision: Revision,
  })
  .meta({ id: 'ServerConnection' })
export type ServerConnection = z.infer<typeof ServerConnection>
export const ServerConnectionPatch = z.object({
  revision: Revision,
  name: ServerConnection.shape.name.optional(),
  enabled: z.boolean().optional(),
})

export const ProductModule = z.object({ module_id: ModuleId, connection_id: Id, config: ModuleFields })
export type ProductModule = z.infer<typeof ProductModule>
export const AdminProductModule = ProductModule.extend({ config_digest: z.string().regex(/^[0-9a-f]{64}$/) })
export const ServerActionRequest = z.object({ input: ModuleFields })
