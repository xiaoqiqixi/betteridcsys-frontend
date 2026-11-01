// @vitest-environment node
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import pkg from '../package.json'
import { buildOpenApi } from '../scripts/openapi'

const FILE = resolve(process.cwd(), 'contract/openapi.json')

describe('OpenAPI export', () => {
  it('matches the committed contract (run `npm run contract` after changing src/contract)', () => {
    const next = JSON.stringify(buildOpenApi(pkg.version), null, 2) + '\n'
    if (process.env.UPDATE_CONTRACT === '1') writeFileSync(FILE, next)
    expect(readFileSync(FILE, 'utf8')).toBe(next)
  })
})
