import type { BillingCycle, Money } from '@/contract'
import type { PricePoint, Product } from '@/contract/commerce'

export const CYCLE_ORDER: BillingCycle[] = [
  'monthly',
  'quarterly',
  'semiannually',
  'annually',
  'biennially',
  'triennially',
  'one_time',
]

export function pricesFor(product: Product, currency: string): PricePoint[] {
  return product.prices
    .filter((p) => p.currency === currency)
    .sort((a, b) => CYCLE_ORDER.indexOf(a.cycle) - CYCLE_ORDER.indexOf(b.cycle))
}

/** Cheapest recurring entry point, used for "from ¥xx/mo" labels. */
export function startingPrice(product: Product, currency: string): PricePoint | null {
  return pricesFor(product, currency)[0] ?? null
}

export function asMoney(p: PricePoint, field: 'recurring_minor' | 'setup_minor' = 'recurring_minor'): Money {
  return { currency: p.currency, amount_minor: p[field], decimal_places: p.decimal_places }
}

const MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  semiannually: 6,
  annually: 12,
  biennially: 24,
  triennially: 36,
  one_time: 0,
}

/** Whole-percent saving of a longer cycle versus paying monthly, or null when not comparable. */
export function savingPercent(product: Product, currency: string, cycle: BillingCycle): number | null {
  const all = pricesFor(product, currency)
  const monthly = all.find((p) => p.cycle === 'monthly')
  const target = all.find((p) => p.cycle === cycle)
  const months = MONTHS[cycle]
  if (!monthly || !target || months <= 1 || monthly.recurring_minor === 0) return null
  const full = monthly.recurring_minor * months
  const pct = Math.floor(((full - target.recurring_minor) / full) * 100)
  return pct > 0 ? pct : null
}

export function flag(country: string): string {
  if (!/^[A-Z]{2}$/.test(country)) return ''
  return String.fromCodePoint(...[...country].map((c) => 0x1f1a5 + c.charCodeAt(0)))
}
