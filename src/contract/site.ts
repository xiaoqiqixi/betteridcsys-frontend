import { z } from 'zod'
import { Country, CurrencyCode, Id, Locale, LocalizedText, Revision, Timestamp } from './common'

export const CurrencyFormat = z
  .object({
    code: CurrencyCode,
    name: z.string().max(60),
    prefix: z.string().max(8),
    suffix: z.string().max(8),
    decimal_places: z.int().min(0).max(6),
  })
  .meta({ id: 'CurrencyFormat' })
export type CurrencyFormat = z.infer<typeof CurrencyFormat>

export const Currency = CurrencyFormat.extend({
  enabled: z.boolean(),
  sort_order: z.int(),
  precision_locked: z.boolean(),
}).meta({ id: 'Currency' })
export type Currency = z.infer<typeof Currency>

export const CurrencyRegistry = z
  .object({ revision: Revision, default_currency: CurrencyCode, currencies: z.array(Currency) })
  .meta({ id: 'CurrencyRegistry' })
export type CurrencyRegistry = z.infer<typeof CurrencyRegistry>

export const SiteSettings = z
  .object({
    site_name: z.string().max(80),
    tagline: LocalizedText.optional(),
    logo: z.enum(['star', 'cloud', 'server', 'orbit']),
    theme: z.enum(['system', 'light', 'dark']),
    accent: z.enum(['blue', 'violet', 'emerald', 'amber']),
    default_locale: Locale,
    enabled_locales: z.array(Locale).min(1),
    support_email: z.string().max(254),
    company_name: z.string().max(160),
    company_address: z.string().max(400),
    terms_url: z.string().max(400),
    privacy_url: z.string().max(400),
    registration_open: z.boolean(),
    email_verification_required: z.boolean(),
    social: z.object({ telegram: z.string().max(200), discord: z.string().max(200), x: z.string().max(200) }),
    revision: Revision,
  })
  .meta({ id: 'SiteSettings' })
export type SiteSettings = z.infer<typeof SiteSettings>

/** Product family → region → node (line). Mirrors the backend catalog taxonomy. */
export const CatalogType = z
  .object({
    id: Id,
    slug: z.string().regex(/^[a-z0-9-]{1,48}$/),
    name: LocalizedText,
    description: LocalizedText.optional(),
    icon: z.enum(['cloud', 'zap', 'server', 'globe', 'cpu', 'shield']),
    sort_order: z.int(),
    visible: z.boolean(),
  })
  .meta({ id: 'CatalogType' })
export type CatalogType = z.infer<typeof CatalogType>

export const CatalogRegion = z
  .object({
    id: Id,
    type_id: Id,
    name: LocalizedText,
    country: Country,
    city: z.string().max(80),
    sort_order: z.int(),
    visible: z.boolean(),
  })
  .meta({ id: 'CatalogRegion' })
export type CatalogRegion = z.infer<typeof CatalogRegion>

export const CatalogNode = z
  .object({
    id: Id,
    region_id: Id,
    name: LocalizedText,
    /** e.g. "CN2 GIA", "CMI", "BGP". Marketing label, no routing semantics. */
    network_label: z.string().max(60),
    test_ip: z.string().max(64),
    sort_order: z.int(),
    visible: z.boolean(),
  })
  .meta({ id: 'CatalogNode' })
export type CatalogNode = z.infer<typeof CatalogNode>

export const CatalogTaxonomy = z
  .object({
    revision: Revision,
    types: z.array(CatalogType),
    regions: z.array(CatalogRegion),
    nodes: z.array(CatalogNode),
  })
  .meta({ id: 'CatalogTaxonomy' })
export type CatalogTaxonomy = z.infer<typeof CatalogTaxonomy>

export const Announcement = z
  .object({
    id: Id,
    title: LocalizedText,
    body: LocalizedText,
    pinned: z.boolean(),
    published_at: Timestamp,
  })
  .meta({ id: 'Announcement' })
export type Announcement = z.infer<typeof Announcement>
