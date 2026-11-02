import { request } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

export const baseURL = process.env.E2E_BASE_URL || 'https://localhost:5178'
export const password = 'Fe2-Local!2026-Deterministic'
export default async function setup() {
  if (process.env.E2E_SEED === '1')
    execFileSync(process.execPath, ['scripts/e2e/seed.mjs'], { stdio: 'inherit' })
  await mkdir('artifacts/e2e', { recursive: true })
  for (const role of ['owner', 'client', 'reader']) {
    const context = await request.newContext({
      baseURL,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: { 'X-Aster-API-Version': '0.6' },
    })
    const session = await (await context.get('/api/v1/session')).json()
    const login = await context.post('/api/v1/auth/login', {
      data: { email: `${role}@fe2.test`, password },
      headers: { 'X-CSRF-Token': session.data.csrf_token, Origin: baseURL },
    })
    if (!login.ok()) throw new Error(`Fixture login ${role}: ${login.status()}`)
    await context.storageState({ path: `artifacts/e2e/${role}.json` })
    await context.dispose()
  }
}
