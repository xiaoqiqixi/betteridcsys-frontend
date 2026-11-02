import { describe, expect, it } from 'vitest'
import { AffiliateSettings, AffiliatePatch, AffiliatePayout } from '@/contract/affiliate'
import { api } from '@/contract/admin-endpoints'

const settings = {
  enabled: false,
  default_rate_bp: 0,
  scope: 'first_payment',
  scope_months: 12,
  hold_days: 30,
  attribution_days: 30,
  min_withdraw: [],
  max_per_referral: [],
  allow_self_referral: false,
  clawback: 'reverse_all',
  product_overrides: [],
  revision: 0,
}
describe('affiliate contract', () => {
  it.each([
    ['default_rate_bp', -1],
    ['default_rate_bp', 10001],
    ['default_rate_bp', 10.5],
    ['scope_months', 0],
    ['scope_months', 121],
    ['hold_days', 366],
    ['attribution_days', 0],
    ['revision', -1],
  ])('rejects invalid %s: %s', (key, value) => {
    expect(AffiliateSettings.safeParse({ ...settings, [key]: value }).success).toBe(false)
  })
  it('accepts explicit zero rates and nullable affiliate overrides', () => {
    expect(AffiliateSettings.parse(settings).default_rate_bp).toBe(0)
    expect(AffiliatePatch.parse({ rate_bp: null, status: 'suspended', note: '' }).rate_bp).toBeNull()
  })
  it('requires a currency, positive integer and nonempty payout reference', () => {
    expect(AffiliatePayout.safeParse({ currency: 'USD', amount_minor: 1, reference: '  ' }).success).toBe(
      false,
    )
    expect(AffiliatePayout.safeParse({ currency: 'USD', amount_minor: 0, reference: 'bank-1' }).success).toBe(
      false,
    )
    expect(AffiliatePayout.parse({ currency: 'USD', amount_minor: 1, reference: 'bank-1' }).currency).toBe(
      'USD',
    )
  })
  it('separates settings and client permissions and makes payouts idempotent', () => {
    expect(api.admin.updateAffiliateSettings.permission).toBe('settings.write')
    expect(api.admin.updateAffiliate.permission).toBe('clients.write')
    expect(api.admin.affiliatePayout.idempotent).toBe(true)
  })
})
