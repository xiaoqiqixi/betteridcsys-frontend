import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { password } from './setup'

let seed: Record<string, string>
test.beforeAll(() => {
  seed = JSON.parse(readFileSync('artifacts/e2e/seed.json', 'utf8'))
})
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('bis.prefs.v1', JSON.stringify({ theme: 'light', locale: 'en' })),
  )
})
async function login(page: Page, identity: string) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(`${identity}@fe2.test`)
  await page.getByLabel('Password', { exact: true }).fill(password)
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/auth/login') && r.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  expect((await response).status()).toBe(200)
  await expect(page).toHaveURL(identity === 'owner' || identity === 'reader' ? /\/admin$/ : /\/dashboard$/)
}

test('auth: register, logout, login and forgot password', async ({ page }) => {
  await page.goto('/register')
  await page.getByLabel('Full name', { exact: true }).fill('FE2 Registered Client')
  await page.getByLabel('Email', { exact: true }).fill('registered@fe2.test')
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('combobox', { name: 'Country / region' }).click()
  await page.getByRole('option', { name: 'China', exact: true }).click()
  await page.getByRole('checkbox').check()
  const registered = page.waitForResponse((r) => r.url().endsWith('/auth/register'))
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  expect((await registered).status()).toBe(200)
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByRole('button', { name: 'Account', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page).toHaveURL('/login')
  await login(page, 'registered')
  await page.getByRole('button', { name: 'Account', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await page.goto('/forgot-password')
  await page.getByLabel('Email', { exact: true }).fill('registered@fe2.test')
  const forgot = page.waitForResponse((r) => r.url().includes('/auth/password/forgot'))
  await page.getByRole('button', { name: /Send/ }).click()
  expect((await forgot).status()).toBe(200)
  await expect(page.getByRole('heading', { name: /Check your inbox/i })).toBeVisible()
})

test.describe('client workflows', () => {
  test.use({ storageState: 'artifacts/e2e/client.json' })
  test('purchase: configure → checkout → credit payment', async ({ page }) => {
    await page.goto('/store/starter')
    await page.getByRole('radio', { name: /Debian/ }).click()
    await page.getByLabel(/^Hostname/).fill('fe2-purchase')
    await page.getByRole('tab', { name: 'SSH keys', exact: true }).click()
    await page.getByRole('checkbox', { name: /FE2 purchase key/ }).check()
    await page.getByRole('button', { name: 'Continue to checkout', exact: true }).click()
    await expect(page).toHaveURL(/\/checkout$/)
    const placed = page.waitForResponse(
      (r) => r.url().endsWith('/api/v1/orders') && r.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Place order', exact: true }).click()
    const response = await placed
    expect(response.status(), JSON.stringify(await response.json())).toBe(200)
    await expect(page).toHaveURL(/\/orders\/[a-z0-9]+$/)
    await expect(page.getByText('Paid', { exact: true }).first()).toBeVisible()
  })
  test('ticket conversation persists replies and hides staff notes', async ({ page, browser }) => {
    await page.goto('/tickets/' + seed.ticketId)
    await page.getByRole('textbox').fill('FE2 deterministic customer reply')
    const reply = page.waitForResponse((r) => r.url().includes('/replies') && r.request().method() === 'POST')
    await page.getByRole('button', { name: 'Send', exact: true }).click()
    expect((await reply).status()).toBe(200)
    await page.reload()
    await expect(page.getByText('FE2 deterministic customer reply', { exact: true })).toBeVisible()
    const staff = await browser.newContext({
      storageState: 'artifacts/e2e/owner.json',
      ignoreHTTPSErrors: true,
    })
    const staffPage = await staff.newPage()
    await staffPage.addInitScript(() =>
      localStorage.setItem('bis.prefs.v1', JSON.stringify({ locale: 'en' })),
    )
    await staffPage.goto(
      (process.env.E2E_BASE_URL || 'https://localhost:5178') + '/admin/tickets/' + seed.ticketId,
    )
    for (const internal of [false, true]) {
      if (internal) await staffPage.getByRole('tab', { name: 'Internal note', exact: true }).click()
      const body = internal ? 'FE2 private staff note' : 'FE2 public staff reply'
      await staffPage.getByRole('textbox').fill(body)
      const sent = staffPage.waitForResponse(
        (r) => r.url().includes('/replies') && r.request().method() === 'POST',
      )
      await staffPage.getByRole('button', { name: internal ? 'Add note' : 'Send', exact: true }).click()
      expect((await sent).status()).toBe(200)
      await expect(staffPage.getByText(body, { exact: true })).toBeVisible()
    }
    await page.reload()
    await expect(page.getByText('FE2 public staff reply', { exact: true })).toBeVisible()
    await expect(page.getByText('FE2 private staff note', { exact: true })).toHaveCount(0)
    await staff.close()
  })
  test('SSH key can be added and removed', async ({ page }) => {
    await page.goto('/account/ssh-keys')
    await page.getByRole('button', { name: 'Add SSH key' }).click()
    await page.getByLabel('Name', { exact: true }).fill('FE2 key')
    await page
      .getByLabel('Public key', { exact: true })
      .fill(readFileSync('tests/e2e/fixtures/id_ed25519.pub', 'utf8').trim())
    const saved = page.waitForResponse(
      (r) => r.url().endsWith('/ssh-keys') && r.request().method() === 'POST',
    )
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Add|Save/ })
      .click()
    expect((await saved).status()).toBe(200)
    await expect(page.getByRole('listitem').filter({ hasText: 'FE2 key' })).toBeVisible()
    await page
      .getByRole('listitem')
      .filter({ hasText: 'FE2 key' })
      .getByRole('button', { name: /Delete|Remove/ })
      .click()
    const removed = page.waitForResponse(
      (r) => r.url().includes('/ssh-keys/') && r.request().method() === 'DELETE',
    )
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Delete|Remove/ })
      .click()
    expect((await removed).status()).toBe(200)
    await expect(page.getByRole('listitem').filter({ hasText: 'FE2 key' })).toHaveCount(0)
  })
  test('API token is shown once and revoked', async ({ page }) => {
    await page.goto('/account/api-tokens')
    await page.getByRole('button', { name: 'Create token' }).click()
    await page.getByLabel('Name', { exact: true }).fill('FE2 token')
    const created = page.waitForResponse(
      (r) => r.url().endsWith('/api-tokens') && r.request().method() === 'POST',
    )
    await page.getByRole('dialog').getByRole('button', { name: 'Create', exact: true }).click()
    const response = await created
    expect(response.status()).toBe(200)
    const data = (await response.json()).data
    await expect(page.getByRole('dialog')).toContainText(data.secret)
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Done|saved|Close/ })
      .click()
    await expect(page.getByText(data.secret, { exact: true })).toHaveCount(0)
    expect(await (await page.request.get('/api/v1/account/api-tokens')).text()).not.toContain(data.secret)
    await page.reload()
    await expect(page.getByRole('listitem').filter({ hasText: 'FE2 token' })).toBeVisible()
    await expect(page.getByText(data.secret, { exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Revoke', exact: true }).click()
    const revoked = page.waitForResponse(
      (r) => r.url().includes('/api-tokens/') && r.request().method() === 'DELETE',
    )
    await page.getByRole('dialog').getByRole('button', { name: 'Revoke', exact: true }).click()
    expect((await revoked).status()).toBe(200)
  })
  test('sessions: current browser is marked and another session can be revoked', async ({
    page,
    browser,
  }) => {
    const other = await browser.newContext({
      storageState: { cookies: [], origins: [] },
      ignoreHTTPSErrors: true,
      userAgent: 'FE2-other-session',
      baseURL: process.env.E2E_BASE_URL || 'https://localhost:5178',
    })
    const otherPage = await other.newPage()
    await otherPage.addInitScript(() =>
      localStorage.setItem('bis.prefs.v1', JSON.stringify({ locale: 'en' })),
    )
    await login(otherPage, 'client')
    await page.goto('/account/security')
    await expect(page.getByText('This device', { exact: true })).toBeVisible()
    await page
      .getByRole('listitem')
      .filter({ hasText: 'FE2-other-session' })
      .getByRole('button', { name: 'Revoke', exact: true })
      .click()
    const revoked = page.waitForResponse(
      (r) => r.url().includes('/sessions/') && r.request().method() === 'DELETE',
    )
    await page.getByRole('dialog').getByRole('button', { name: 'Revoke', exact: true }).click()
    expect((await revoked).status()).toBe(200)
    await otherPage.reload()
    await expect(otherPage).toHaveURL(/\/login/)
    await other.close()
  })
  test('service: rename, auto-renew, cancellation withdrawal and credit renewal', async ({ page }) => {
    const detail = page.waitForResponse((r) => r.url().endsWith('/api/v1/services/' + seed.serviceId))
    await page.goto('/services/' + seed.serviceId)
    const response = await detail
    expect(response.status()).toBe(200)
    const before = (await response.json()).data
    await expect(page.getByRole('heading', { name: /fe2-existing-service/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Power', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Console', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Actions', exact: true }).click()
    await expect(page.getByRole('menuitem', { name: 'Reinstall', exact: true })).toHaveCount(0)
    await page.getByRole('menuitem', { name: 'Rename', exact: true }).click()
    await page.getByRole('dialog').getByRole('textbox').fill('FE2 renamed service')
    const renamed = page.waitForResponse(
      (r) => r.url().endsWith('/api/v1/services/' + seed.serviceId) && r.request().method() === 'PATCH',
    )
    await page.getByRole('dialog').getByRole('button', { name: 'Save changes', exact: true }).click()
    expect((await renamed).status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'FE2 renamed service' })).toBeVisible()
    const toggled = page.waitForResponse(
      (r) => r.url().endsWith('/api/v1/services/' + seed.serviceId) && r.request().method() === 'PATCH',
    )
    await page.getByRole('switch', { name: 'Auto-renew with credit' }).click()
    expect((await toggled).status()).toBe(200)
    await expect(page.getByRole('switch', { name: 'Auto-renew with credit' })).not.toBeChecked()
    await page.getByRole('button', { name: 'Actions', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Cancel service', exact: true }).click()
    await page.getByRole('dialog').getByLabel('Reason', { exact: true }).fill('FE2 reversible cancellation')
    const cancelled = page.waitForResponse(
      (r) => r.url().endsWith('/cancellation') && r.request().method() === 'POST',
    )
    await page.getByRole('dialog').getByRole('button', { name: 'Request cancellation', exact: true }).click()
    expect((await cancelled).status()).toBe(200)
    const withdrawn = page.waitForResponse(
      (r) => r.url().endsWith('/cancellation') && r.request().method() === 'DELETE',
    )
    await page.getByRole('button', { name: 'Withdraw request', exact: true }).click()
    expect((await withdrawn).status()).toBe(200)
    await expect(page.getByRole('button', { name: 'Withdraw request', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Renew now', exact: true }).click()
    const renewed = page.waitForResponse((r) => r.url().endsWith('/renew') && r.request().method() === 'POST')
    await page.getByRole('dialog').getByRole('button', { name: 'Create invoice', exact: true }).click()
    expect((await renewed).status()).toBe(200)
    await expect(page).toHaveURL(/\/invoices\/[a-z0-9]+$/)
    await page.getByRole('radio', { name: /Account credit/ }).click()
    const paid = page.waitForResponse((r) => r.url().endsWith('/pay') && r.request().method() === 'POST')
    await page.getByRole('button', { name: /^Pay / }).click()
    expect((await paid).status()).toBe(200)
    await expect(page.getByText('Paid', { exact: true }).first()).toBeVisible()
    const refreshed = page.waitForResponse((r) => r.url().endsWith('/api/v1/services/' + seed.serviceId))
    await page.goto('/services/' + seed.serviceId)
    const after = (await (await refreshed).json()).data
    expect(Date.parse(after.next_due_at)).toBeGreaterThan(Date.parse(before.next_due_at))
    await expect(page.getByRole('heading', { name: 'FE2 renamed service' })).toBeVisible()
  })
  test('bank-transfer checkout returns real plugin instructions', async ({ page }) => {
    await page.goto('/invoices/' + seed.invoiceId)
    await page.getByRole('radio', { name: /Bank transfer/ }).click()
    const payment = page.waitForResponse((r) => r.url().endsWith('/pay') && r.request().method() === 'POST')
    await page.getByRole('button', { name: /^Pay / }).click()
    const response = await payment
    expect(response.status()).toBe(200)
    expect((await response.json()).data.status).toBe('instructions')
    await expect(page.getByText(/FE2 TEST BANK/)).toBeVisible()
  })
  test('failed SSH reads show a retry state and dialogs preserve keyboard focus', async ({ page }) => {
    await page.route('**/api/v1/account/ssh-keys', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'INTERNAL', message: 'FE2 injected read failure' } }),
      }),
    )
    await page.goto('/account/ssh-keys')
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByText('You have no SSH keys yet.', { exact: true })).toHaveCount(0)
    await page.unroute('**/api/v1/account/ssh-keys')
    const retried = page.waitForResponse((r) => r.url().endsWith('/api/v1/account/ssh-keys'))
    await page.getByRole('button', { name: 'Try again' }).click()
    expect((await retried).status()).toBe(200)
    await expect(page.getByRole('alert')).toHaveCount(0)
    const trigger = page.getByRole('button', { name: 'Add SSH key' })
    await trigger.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.locator(':focus')).toHaveCount(1)
    await dialog.getByRole('button', { name: 'Close', exact: true }).focus()
    await page.keyboard.press('Shift+Tab')
    await expect(dialog.locator(':focus')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
    const collapse = page.getByRole('button', { name: 'Collapse', exact: true })
    await collapse.click()
    await expect(collapse).toHaveAttribute('aria-expanded', 'false')
    const newService = page.getByRole('link', { name: 'New service', exact: true })
    await newService.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL('/store')
  })
})

test.describe('admin workflows', () => {
  test.use({ storageState: 'artifacts/e2e/owner.json' })
  test('product price matrix saves exact CNY and USD minor units', async ({ page }) => {
    await page.goto('/admin/products/standard')
    await page.getByLabel('Monthly CNY', { exact: true }).fill('23.45')
    await page.getByLabel('Quarterly USD', { exact: true }).fill('67.89')
    await page.getByLabel('Annually CNY', { exact: true }).fill('234.56')
    const saved = page.waitForResponse(
      (r) => r.url().endsWith('/admin/products/standard') && r.request().method() === 'PATCH',
    )
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    const response = await saved
    expect(response.status()).toBe(200)
    const prices = (await response.json()).data.prices
    expect(prices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ currency: 'CNY', cycle: 'monthly', recurring_minor: 2345 }),
        expect.objectContaining({ currency: 'USD', cycle: 'quarterly', recurring_minor: 6789 }),
        expect.objectContaining({ currency: 'CNY', cycle: 'annually', recurring_minor: 23456 }),
      ]),
    )
    await page.reload()
    await expect(page.getByLabel('Monthly CNY', { exact: true })).toHaveValue('23.45')
  })
})

test.describe('RBAC', () => {
  test.use({ storageState: 'artifacts/e2e/reader.json' })
  test('read-only staff cannot see or invoke write actions', async ({ page }) => {
    await page.goto('/admin/products')
    await expect(page.getByRole('button', { name: /Create product/ })).toHaveCount(0)
    await page.goto('/admin/products/starter')
    await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toHaveCount(0)
    await expect(page.getByLabel('Monthly CNY', { exact: true })).toBeDisabled()
    await page.goto('/admin/staff')
    await expect(page).toHaveURL(/\/admin\/forbidden$/)
    const session = (await (await page.request.get('/api/v1/session')).json()).data
    const response = await page.request.patch('/api/v1/admin/products/starter', {
      data: {},
      headers: { 'X-CSRF-Token': session.csrf_token },
    })
    expect(response.status()).toBe(403)
  })
})
