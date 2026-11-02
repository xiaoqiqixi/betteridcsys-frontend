import { z } from 'zod'
import { BillingCycle, CurrencyCode, Id, LocalizedText, MinorAmount } from './common'

/* ---------------------------------------------------------------- products */

export const ProductKind = z
  .enum(['cloud_server', 'dedicated_server', 'generic'])
  .meta({ id: 'ProductKind', description: 'cloud_server is provisioned through a cloud controller.' })

export const ProductSpecs = z
  .object({
    cpu_cores: z.int().min(0),
    memory_mb: z.int().min(0),
    disk_gb: z.int().min(0),
    bandwidth_mbps: z.int().min(0),
    /** null = unmetered. */
    traffic_gb: z.int().min(0).nullable(),
    ipv4: z.int().min(0),
    ipv6: z.boolean(),
  })
  .meta({ id: 'ProductSpecs' })
export type ProductSpecs = z.infer<typeof ProductSpecs>

/** Price of one billing cycle in one currency. Missing combinations are not sold. */
export const PricePoint = z
  .object({
    cycle: BillingCycle,
    currency: CurrencyCode,
    recurring_minor: MinorAmount.min(0),
    setup_minor: MinorAmount.min(0),
    decimal_places: z.int().min(0).max(6),
  })
  .meta({ id: 'PricePoint' })
export type PricePoint = z.infer<typeof PricePoint>

export const OptionChoice = z
  .object({
    id: Id,
    label: LocalizedText,
    /** Extra recurring charge per cycle and currency; empty means free. */
    prices: z.array(PricePoint),
  })
  .meta({ id: 'OptionChoice' })

/**
 * Configurable option (配置项). `os_image` choices are resolved from the cloud image catalog;
 * `quantity` options multiply the unit price.
 */
export const ProductOption = z
  .object({
    id: Id,
    key: z.string().regex(/^[a-z][a-z0-9_]{0,47}$/),
    kind: z.enum(['select', 'quantity', 'os_image']),
    label: LocalizedText,
    required: z.boolean(),
    choices: z.array(OptionChoice),
    min: z.int().min(0).optional(),
    max: z.int().min(0).optional(),
    unit_prices: z.array(PricePoint).optional(),
  })
  .meta({ id: 'ProductOption' })
export type ProductOption = z.infer<typeof ProductOption>

export const OsImage = z
  .object({
    id: Id,
    family: z.enum([
      'ubuntu',
      'debian',
      'centos',
      'rocky',
      'alma',
      'fedora',
      'windows',
      'alpine',
      'arch',
      'other',
    ]),
    name: z.string().max(80),
    version: z.string().max(40),
    min_disk_gb: z.int().min(1),
  })
  .meta({ id: 'OsImage' })
export type OsImage = z.infer<typeof OsImage>

export const Product = z
  .object({
    id: Id,
    slug: z.string().regex(/^[a-z0-9-]{1,64}$/),
    kind: ProductKind,
    type_id: Id,
    region_id: Id,
    node_id: Id,
    name: LocalizedText,
    description: LocalizedText,
    badges: z.array(z.enum(['new', 'hot', 'limited', 'best_value'])),
    specs: ProductSpecs,
    prices: z.array(PricePoint),
    options: z.array(ProductOption),
    os_images: z.array(OsImage),
    /** null = unlimited. */
    stock: z.int().min(0).nullable(),
    available: z.boolean(),
    sort_order: z.int(),
  })
  .meta({ id: 'Product' })
export type Product = z.infer<typeof Product>

export const ProductQuery = z.object({
  type: z.string().max(64).optional(),
  region: z.string().max(64).optional(),
  currency: CurrencyCode.optional(),
})
