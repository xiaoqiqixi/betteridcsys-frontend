import type { Money } from '@/contract'
import { MAX_MINOR } from '@/contract'

/**
 * Exact money helpers. Amounts are integer minor units; nothing here goes through a
 * binary float, so 0.1 + 0.2 style drift cannot reach an invoice.
 */

const formatters = new Map<string, Intl.NumberFormat>()

function formatter(locale: string, currency: string, digits: number, compact = false) {
  const key = `${locale}|${currency}|${digits}|${compact}`
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: compact ? 0 : digits,
      maximumFractionDigits: digits,
      ...(compact ? { notation: 'compact' as const } : {}),
    })
    formatters.set(key, f)
  }
  return f
}

/** "1234" with 2 decimals → "12.34"; keeps the sign. */
export function minorToDecimal(minor: number, decimals: number): string {
  if (!Number.isSafeInteger(minor)) throw new RangeError('amount is not a safe integer')
  const negative = minor < 0
  const digits = Math.abs(minor)
    .toString()
    .padStart(decimals + 1, '0')
  const whole = decimals ? digits.slice(0, -decimals) : digits
  const frac = decimals ? digits.slice(-decimals) : ''
  return (negative ? '-' : '') + whole + (frac ? '.' + frac : '')
}

export function formatMoney(
  m: Money,
  locale: string,
  opts: { compact?: boolean; signed?: boolean } = {},
): string {
  const decimal = minorToDecimal(m.amount_minor, m.decimal_places)
  let out: string
  try {
    // Intl accepts exact decimal strings, which avoids float rounding entirely.
    out = formatter(locale, m.currency, m.decimal_places, opts.compact).format(decimal as unknown as number)
  } catch {
    out = `${m.currency} ${decimal}`
  }
  if (opts.signed && m.amount_minor > 0) out = '+' + out
  return out
}

/**
 * Parse user input like "12.5" into minor units for `decimals` places.
 * Returns null for anything that is not a plain non-negative decimal within range.
 */
export function parseDecimal(input: string, decimals: number): number | null {
  const s = input.trim().replace(/,/g, '')
  const re = decimals > 0 ? new RegExp(`^(\\d{1,15})(?:\\.(\\d{0,${decimals}}))?$`) : /^(\d{1,15})$/
  const m = re.exec(s)
  if (!m) return null
  const whole = m[1] ?? '0'
  const frac = (m[2] ?? '').padEnd(decimals, '0')
  const value = Number(whole + frac)
  return Number.isSafeInteger(value) && value <= MAX_MINOR ? value : null
}

export function money(currency: string, amount_minor: number, decimal_places = 2): Money {
  return { currency, amount_minor, decimal_places }
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency || a.decimal_places !== b.decimal_places) throw new Error('currency mismatch')
  const sum = a.amount_minor + b.amount_minor
  if (!Number.isSafeInteger(sum)) throw new RangeError('amount overflow')
  return { ...a, amount_minor: sum }
}

export function isZero(m: Money | null | undefined): boolean {
  return !m || m.amount_minor === 0
}
