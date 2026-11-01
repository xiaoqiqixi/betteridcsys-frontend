import { describe, expect, it } from 'vitest'
import { safeRedirect } from '@/modules/auth/redirect'
import { generatePassword, HOSTNAME, passwordStrongEnough } from '@/modules/store/lib/password'
import { savingPercent } from '@/modules/store/lib/pricing'
import type { Product } from '@/contract/commerce'

describe('generatePassword', () => {
  it('always contains every character class', () => {
    for (let i = 0; i < 200; i++) {
      const p = generatePassword()
      expect(p).toHaveLength(20)
      expect(passwordStrongEnough(p)).toBe(true)
      expect(/[@#%+=_-]/.test(p)).toBe(true)
    }
  })
})

describe('HOSTNAME', () => {
  it.each(['web-01', 'a', 'api.example.com', 'x1.y2'])('accepts %s', (h) =>
    expect(HOSTNAME.test(h)).toBe(true),
  )
  it.each(['-web', 'web-', 'Web', 'a..b', 'a_b', 'a'.repeat(64)])('rejects %s', (h) =>
    expect(HOSTNAME.test(h)).toBe(false),
  )
})

describe('safeRedirect', () => {
  it('only allows same-origin absolute paths', () => {
    expect(safeRedirect('/services/1', '/d')).toBe('/services/1')
    expect(safeRedirect('//evil.example', '/d')).toBe('/d')
    expect(safeRedirect('/\\evil.example', '/d')).toBe('/d')
    expect(safeRedirect('https://evil.example', '/d')).toBe('/d')
    expect(safeRedirect(['/x'], '/d')).toBe('/d')
    expect(safeRedirect('/a\nb', '/d')).toBe('/d')
  })
})

describe('savingPercent', () => {
  const p = {
    prices: [
      { cycle: 'monthly', currency: 'USD', recurring_minor: 1000, setup_minor: 0, decimal_places: 2 },
      { cycle: 'annually', currency: 'USD', recurring_minor: 10000, setup_minor: 0, decimal_places: 2 },
    ],
  } as unknown as Product
  it('compares a longer cycle against twelve monthly payments', () => {
    expect(savingPercent(p, 'USD', 'annually')).toBe(16)
    expect(savingPercent(p, 'USD', 'monthly')).toBeNull()
    expect(savingPercent(p, 'EUR', 'annually')).toBeNull()
  })
})
