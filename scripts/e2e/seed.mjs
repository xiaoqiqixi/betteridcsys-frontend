import { createHash } from 'node:crypto'
import { request } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

export const baseURL = process.env.E2E_BASE_URL || 'https://localhost:5178'
export const password = 'Fe2-Local!2026-Deterministic'
export async function client(email) {
  const context = await request.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: { 'X-Aster-API-Version': '0.6' },
  })
  let csrf = (await (await context.get('/api/v1/session')).json()).data.csrf_token
  async function call(path, data, method = data === undefined ? 'GET' : 'POST') {
    const response = await context.fetch('/api/v1' + path, {
      method,
      data,
      headers: {
        Origin: baseURL,
        'X-Aster-API-Version': '0.6',
        'X-CSRF-Token': csrf,
        'Idempotency-Key':
          'fe2-' +
          createHash('sha256')
            .update(path + JSON.stringify(data ?? null))
            .digest('hex'),
      },
    })
    const body = await response.json()
    if (!response.ok()) throw new Error(`${method} ${path}: ${response.status()} ${JSON.stringify(body)}`)
    if (body.data?.csrf_token) csrf = body.data.csrf_token
    return body.data
  }
  if (email) await call('/auth/login', { email, password, remember: false })
  return { context, call }
}

async function seed() {
  const owner = await client('owner@fe2.test')
  const gateways = await owner.call('/payment-gateways', undefined)
  if (!gateways.some((g) => g.id === 'bank' && g.flow === 'instructions')) {
    throw new Error('The real bank-transfer plugin must be ready before seeding')
  }
  const registry = await owner.call('/admin/currencies')
  if (!registry.currencies.some((c) => c.code === 'USD')) {
    await owner.call('/admin/currencies', {
      revision: registry.revision,
      default_currency: 'CNY',
      currencies: [
        ...registry.currencies,
        {
          code: 'USD',
          name: 'US Dollar',
          prefix: '$',
          suffix: '',
          decimal_places: 2,
          enabled: true,
          sort_order: 1,
        },
      ].map(({ code, name, prefix, suffix, decimal_places, enabled, sort_order }) => ({
        code,
        name,
        prefix,
        suffix,
        decimal_places,
        enabled,
        sort_order,
      })),
    })
  }
  for (const [i, id] of ['starter', 'standard', 'performance'].entries()) {
    const product = await owner.call('/admin/products/' + id)
    const prices = ['CNY', 'USD'].flatMap((currency) =>
      ['monthly', 'quarterly', 'annually'].map((cycle, n) => ({
        currency,
        cycle,
        recurring_minor: (i + 1) * [1000, 2700, 10000][n],
        setup_minor: 0,
        decimal_places: 2,
      })),
    )
    const { revision, slug, node_id, specs } = product
    await owner.call(
      '/admin/products/' + id,
      {
        revision,
        slug,
        node_id,
        specs,
        kind: 'generic',
        name: { en: `FE2 ${id}`, 'zh-CN': `联调 ${id}` },
        description: { en: 'Local integration fixture', 'zh-CN': '本地联调数据' },
        badges: [],
        prices,
        options: [],
        os_image_ids: ['fe2-debian', 'fe2-ubuntu'],
        stock: null,
        visibility: 'public',
        controller_id: null,
        remote_product_id: null,
        sort_order: i,
      },
      'PATCH',
    )
  }
  const customers = await owner.call('/admin/clients')
  const customer = customers.items.find((c) => c.email === 'client@fe2.test')
  if (customer.credit.amount_minor < 1000000)
    await owner.call(`/admin/clients/${customer.id}/credit`, {
      amount_minor: 1000000,
      reason: 'FE2 disposable test balance',
    })
  await owner.call('/admin/announcements', {
    title: { en: 'FE2 maintenance notice', 'zh-CN': '联调维护公告' },
    body: { en: 'Seeded announcement for integration testing.', 'zh-CN': '用于本地联调的公告。' },
    pinned: true,
    published: true,
  })
  const customerApi = await client('client@fe2.test')
  const ticket = await customerApi.call('/tickets', {
    department_id: 'technical',
    subject: 'FE2 seeded ticket',
    body: 'Please check the seeded service.',
    priority: 'normal',
  })
  const keys = await customerApi.call('/account/ssh-keys')
  if (!keys.some((key) => key.name === 'FE2 purchase key'))
    await customerApi.call('/account/ssh-keys', {
      name: 'FE2 purchase key',
      public_key: (await readFile('tests/e2e/fixtures/seed_ed25519.pub', 'utf8')).trim(),
    })
  const items = [{ product_id: 'starter', cycle: 'monthly', quantity: 1, options: {} }]
  const quote = await customerApi.call('/cart/quote', { items, currency: 'CNY' })
  const { order, invoice } = await customerApi.call('/orders', {
    items,
    currency: 'CNY',
    quote_digest: quote.quote_digest,
    apply_credit: false,
  })
  const invoiceId = invoice.id
  await mkdir('artifacts/e2e', { recursive: true })
  await writeFile(
    'artifacts/e2e/seed.json',
    JSON.stringify(
      {
        clientId: customer.id,
        ticketId: ticket.id,
        orderId: order.id,
        invoiceId,
        serviceId: 'fe200000000000000000000000000001',
        productId: 'starter',
      },
      null,
      2,
    ),
  )
  await owner.context.dispose()
  await customerApi.context.dispose()
  console.log(
    'Seeded owner, client, reader, CNY/USD products, OS images, departments, announcement, credit, ticket and order.',
  )
}
if (process.argv[1]?.endsWith('/seed.mjs')) await seed()
