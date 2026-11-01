import { describe, expect, it } from 'vitest'
import { addMoney, formatMoney, minorToDecimal, parseDecimal } from '@/shared/lib/money'

describe('money', () => {
  it('converts minor units without floating point drift', () => {
    expect(minorToDecimal(1, 2)).toBe('0.01')
    expect(minorToDecimal(-1050, 2)).toBe('-10.50')
    expect(minorToDecimal(9_007_199_254_740_991, 2)).toBe('90071992547409.91')
    expect(minorToDecimal(5, 0)).toBe('5')
    expect(minorToDecimal(1234567, 3)).toBe('1234.567')
  })
  it('rejects unsafe integers', () => {
    expect(() => minorToDecimal(0.5, 2)).toThrow()
    expect(() => minorToDecimal(2 ** 60, 2)).toThrow()
  })
  it('parses user input exactly', () => {
    expect(parseDecimal('0.1', 2)).toBe(10)
    expect(parseDecimal('19.99', 2)).toBe(1999)
    expect(parseDecimal('1,000.5', 2)).toBe(100050)
    expect(parseDecimal('7', 0)).toBe(7)
    expect(parseDecimal('1.234', 2)).toBeNull()
    expect(parseDecimal('-1', 2)).toBeNull()
    expect(parseDecimal('abc', 2)).toBeNull()
    expect(parseDecimal('1.5', 0)).toBeNull()
  })
  it('formats with the currency symbol and fixed decimals', () => {
    expect(formatMoney({ currency: 'USD', amount_minor: 123456, decimal_places: 2 }, 'en-US')).toBe(
      '$1,234.56',
    )
    expect(formatMoney({ currency: 'JPY', amount_minor: 1500, decimal_places: 0 }, 'en-US')).toBe('¥1,500')
    expect(
      formatMoney({ currency: 'USD', amount_minor: 500, decimal_places: 2 }, 'en-US', { signed: true }),
    ).toBe('+$5.00')
  })
  it('refuses to add different currencies', () => {
    const usd = { currency: 'USD', amount_minor: 1, decimal_places: 2 }
    expect(addMoney(usd, usd).amount_minor).toBe(2)
    expect(() => addMoney(usd, { ...usd, currency: 'EUR' })).toThrow()
  })
})
