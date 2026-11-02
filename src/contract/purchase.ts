import { z } from 'zod'
import { ModuleFields } from './server'
import { BillingCycle, CurrencyCode, Id, LocalizedText, MinorAmount, Money, Timestamp } from './common'

/* -------------------------------------------------------------- cart/quote */

export const CartItemInput = z
  .object({
    product_id: Id,
    /** Validated against product.order_schema. writeOnly fields are never persisted or echoed. */
    module_fields: ModuleFields.optional(),
    cycle: BillingCycle,
    quantity: z.int().min(1).max(20),
    options: z.record(z.string(), z.union([z.string(), z.int()])),
    hostname: z
      .string()
      .regex(/^(?=.{1,63}$)[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/)
      .optional(),
    /** Credentials for the first boot. Never echoed back. */
    root_password: z.string().min(12).max(128).optional(),
    ssh_key_ids: z.array(Id).max(10).optional(),
  })
  .meta({ id: 'CartItemInput' })
export type CartItemInput = z.infer<typeof CartItemInput>

export const QuoteRequest = z.object({
  items: z.array(CartItemInput).min(1).max(20),
  coupon: z.string().max(64).optional(),
  currency: CurrencyCode,
})
export type QuoteRequest = z.infer<typeof QuoteRequest>

export const QuoteLine = z
  .object({
    kind: z.enum(['product', 'option', 'setup', 'discount']),
    item_index: z.int().min(0).nullable(),
    description: z.string(),
    amount: Money,
  })
  .meta({ id: 'QuoteLine' })
export type QuoteLine = z.infer<typeof QuoteLine>

export const Quote = z
  .object({
    currency: CurrencyCode,
    lines: z.array(QuoteLine),
    subtotal: Money,
    discount: Money,
    total: Money,
    /** Recurring amount per item after the first period, for display. */
    renewals: z.array(z.object({ item_index: z.int(), cycle: BillingCycle, amount: Money })),
    coupon: z.object({ code: z.string(), valid: z.boolean(), message: z.string().optional() }).nullable(),
    /** Digest the order endpoint compares against to reject stale prices (409 QUOTE_CHANGED). */
    quote_digest: z.string().regex(/^[0-9a-f]{64}$/),
    expires_at: Timestamp,
  })
  .meta({ id: 'Quote' })
export type Quote = z.infer<typeof Quote>

/**
 * A payment method provided by an installed payment plugin (slot). Any number of plugins can
 * be active at once; the UI renders whatever the backend lists, so adding a gateway never
 * needs a frontend change.
 */
export const CheckoutFlow = z.enum(['redirect', 'qr', 'instructions']).meta({
  id: 'CheckoutFlow',
  description: 'redirect: hosted page · qr: scan-to-pay payload · instructions: offline transfer details',
})

export const PaymentGateway = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,63}$/),
    name: LocalizedText,
    description: LocalizedText.optional(),
    /** `data:image/svg+xml;base64,…` or `data:image/png;base64,…`, ≤ 16 KiB, supplied by the plugin manifest. */
    logo: z
      .string()
      .max(22000)
      .regex(/^data:image\/(svg\+xml|png);base64,[A-Za-z0-9+/=]+$/)
      .nullable(),
    flow: CheckoutFlow,
    currencies: z.array(CurrencyCode),
    /** Fee the gateway adds on top, shown before paying. Absent when free. */
    fee: z
      .object({
        percent_bp: z.int().min(0).max(10000),
        fixed: z.array(z.object({ currency: CurrencyCode, amount_minor: MinorAmount.min(0) })),
      })
      .nullable(),
    min: z.array(z.object({ currency: CurrencyCode, amount_minor: MinorAmount.min(0) })),
    max: z.array(z.object({ currency: CurrencyCode, amount_minor: MinorAmount.min(0) })),
  })
  .meta({ id: 'PaymentGateway' })
export type PaymentGateway = z.infer<typeof PaymentGateway>
