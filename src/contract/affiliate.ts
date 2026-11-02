import { z } from 'zod'
import { CurrencyCode, Id, MinorAmount, Money, Revision, Timestamp } from './common'

export const AffiliateRate = z.int().min(0).max(10000)
export const AffiliateScope = z.enum(['first_payment', 'all_payments', 'first_months'])
export const AffiliateCurrencyAmount = z
  .object({ currency: CurrencyCode, amount_minor: MinorAmount.min(0) })
  .meta({ id: 'AffiliateCurrencyAmount' })
export const AffiliateBalance = z
  .object({
    currency: CurrencyCode,
    pending: Money,
    available: Money,
    paid_out: Money,
    /** Refund debt offsets future commissions; spendable balances never go negative. */
    debt: Money,
  })
  .meta({ id: 'AffiliateBalance' })
export type AffiliateBalance = z.infer<typeof AffiliateBalance>

export const AffiliateSettings = z
  .object({
    enabled: z.boolean(),
    default_rate_bp: AffiliateRate,
    scope: AffiliateScope,
    scope_months: z.int().min(1).max(120),
    hold_days: z.int().min(0).max(365),
    attribution_days: z.int().min(1).max(365),
    min_withdraw: z.array(AffiliateCurrencyAmount).max(200),
    max_per_referral: z.array(AffiliateCurrencyAmount).max(200),
    allow_self_referral: z.boolean(),
    clawback: z.enum(['reverse_pending', 'reverse_all']),
    product_overrides: z.array(z.object({ product_id: Id, rate_bp: AffiliateRate })).max(1000),
    revision: Revision,
  })
  .meta({ id: 'AffiliateSettings' })
export type AffiliateSettings = z.infer<typeof AffiliateSettings>

export const AffiliateSummary = z
  .object({
    /** Whether this client has activated an affiliate account. */
    enabled: z.boolean(),
    earning_enabled: z.boolean(),
    code: z.string().nullable(),
    link: z.string().nullable(),
    rate_bp: AffiliateRate,
    referrals: z.int().min(0),
    balances: z.array(AffiliateBalance),
    scope: AffiliateScope,
    scope_months: z.int().min(1).max(120),
    hold_days: z.int().min(0).max(365),
    min_withdraw: z.array(AffiliateCurrencyAmount),
  })
  .meta({ id: 'AffiliateSummary' })
export type AffiliateSummary = z.infer<typeof AffiliateSummary>

export const AdminAffiliateSummary = z
  .object({
    id: Id,
    name: z.string(),
    email: z.string(),
    code: z.string(),
    referrals: z.int().min(0),
    balances: z.array(AffiliateBalance),
    rate_bp: AffiliateRate.nullable(),
    status: z.enum(['active', 'suspended']),
    created_at: Timestamp,
  })
  .meta({ id: 'AdminAffiliateSummary' })
export type AdminAffiliateSummary = z.infer<typeof AdminAffiliateSummary>
export const AdminAffiliate = AdminAffiliateSummary.extend({ note: z.string().max(2000) }).meta({
  id: 'AdminAffiliate',
})
export type AdminAffiliate = z.infer<typeof AdminAffiliate>
export const AffiliatePatch = z
  .object({
    rate_bp: AffiliateRate.nullable(),
    status: z.enum(['active', 'suspended']),
    note: z.string().max(2000),
  })
  .meta({ id: 'AffiliatePatch' })
export const AffiliatePayout = z
  .object({
    currency: CurrencyCode,
    amount_minor: MinorAmount.min(1),
    reference: z.string().trim().min(1).max(120),
  })
  .meta({ id: 'AffiliatePayout' })
export const AffiliateReferral = z
  .object({
    id: Id,
    joined_at: Timestamp,
    client: z.string(),
    commissions: z.array(Money),
    status: z.enum(['signed_up', 'converted']),
  })
  .meta({ id: 'AffiliateReferral' })
export const AffiliateWithdraw = z.object({ amount_minor: MinorAmount.min(1) })
