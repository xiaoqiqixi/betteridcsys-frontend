import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { pages } from './pages'
import knownGaps from './known-backend-gaps.json' with { type: 'json' }
import compatibility from '../../compatibility.json' with { type: 'json' }

const operationGaps: Record<string, string[]> = knownGaps.operations
function signature(issue: { path: (string | number)[]; [key: string]: unknown }) {
  return JSON.stringify(
    { ...issue, path: issue.path.map((p) => (typeof p === 'number' ? '*' : p)) },
    Object.keys(issue).sort(),
  )
}

let seed: Record<string, string>
test.beforeAll(() => {
  seed = JSON.parse(readFileSync('artifacts/e2e/seed.json', 'utf8'))
})
const mainPages = new Set([
  'home',
  'store',
  'configure',
  'login',
  'register',
  'dashboard',
  'services',
  'service',
  'orders',
  'order',
  'invoices',
  'invoice',
  'affiliate',
  'admin-services',
  'admin-service',
  'admin-orders',
  'admin-order',
  'admin-invoices',
  'admin-invoice',
  'admin-ticket',
  'admin-integrations',
  'admin-catalog',
  'billing',
  'account',
  'account-security',
  'account-ssh',
  'account-tokens',
  'ticket-new',
  'ticket',
  'admin',
  'admin-products',
  'admin-product',
  'admin-client',
  'admin-settings',
  'admin-affiliate',
])
for (const width of [375, 768, 1280, 1440]) {
  for (const theme of ['light', 'dark'] as const) {
    for (const locale of ['zh-CN', 'en']) {
      test(`${width} ${theme} ${locale}: every route`, async ({ browser }, info) => {
        test.setTimeout(300_000)
        expect(knownGaps.source_commit).toBe(compatibility.source_commit)
        const findings: unknown[] = []
        const regressions: string[] = []
        const known404 = new Set(['/api/v1/admin/integrations/controllers'])
        for (const actor of ['guest', 'client', 'owner'] as const) {
          const context = await browser.newContext({
            ignoreHTTPSErrors: true,
            viewport: { width, height: 900 },
            colorScheme: theme,
            reducedMotion: 'reduce',
            storageState: actor === 'guest' ? undefined : `artifacts/e2e/${actor}.json`,
          })
          await context.addInitScript(
            ({ theme, locale }) => {
              localStorage.setItem('bis.prefs.v1', JSON.stringify({ theme, locale }))
              // Serialize while the document is alive; JSHandles can expire during navigation.
              const error = console.error.bind(console)
              console.error = (...args: unknown[]) => {
                if (typeof args[0] === 'string' && args[0].startsWith('[contract]')) {
                  error(args[0], JSON.stringify(args[1]))
                } else error(...args)
              }
            },
            { theme, locale },
          )
          const page = await context.newPage()
          for (const entry of pages.filter((p) => p.actor === actor)) {
            const errors: string[] = [],
              failed: string[] = [],
              contracts: {
                operation: string
                issues: { path: (string | number)[]; [key: string]: unknown }[]
              }[] = []
            const onConsole = (msg: import('@playwright/test').ConsoleMessage) => {
              if (msg.type() !== 'error' && msg.type() !== 'warning') return
              if (msg.text().startsWith('[contract]')) {
                const match = /^\[contract\] (\w+) response mismatch (.*)$/.exec(msg.text())
                if (match) contracts.push({ operation: match[1]!, issues: JSON.parse(match[2]!) })
                else errors.push(msg.text())
              } else errors.push(msg.text())
            }
            const onError = (error: Error) => errors.push(error.message)
            const onResponse = (r: import('@playwright/test').Response) => {
              if (r.status() >= 400) failed.push(`${r.status()} ${new URL(r.url()).pathname}`)
            }
            const onFailed = (r: import('@playwright/test').Request) => {
              if (!r.failure()?.errorText.includes('ERR_ABORTED'))
                failed.push(`${r.failure()?.errorText} ${new URL(r.url()).pathname}`)
            }
            page
              .on('console', onConsole)
              .on('pageerror', onError)
              .on('response', onResponse)
              .on('requestfailed', onFailed)
            const path = entry.path.replace(/:(\w+)/g, (_, key: string) => seed[key]!)
            await page.goto((process.env.E2E_BASE_URL || 'https://localhost:5178') + path)
            await page.waitForLoadState('networkidle')
            await expect(page.locator('.skeleton')).toHaveCount(0)
            const overflow = await page.evaluate(() => ({
              width: innerWidth,
              scroll: document.documentElement.scrollWidth,
              elements: [...document.querySelectorAll('body *')]
                .filter(
                  (e) =>
                    e.getBoundingClientRect().right > innerWidth + 1 &&
                    getComputedStyle(e).position !== 'fixed',
                )
                .slice(0, 8)
                .map((e) => ({ tag: e.tagName, classes: e.className, text: e.textContent?.slice(0, 80) })),
            }))
            const axe =
              (width === 375 || width === 1280) && mainPages.has(entry.name)
                ? (
                    await new AxeBuilder({ page })
                      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
                      .analyze()
                  ).violations
                : []
            findings.push({
              name: entry.name,
              path,
              actor,
              width,
              theme,
              locale,
              finalPath: new URL(page.url()).pathname,
              errors,
              failed,
              contracts,
              overflow,
              axe,
              alerts: await page.getByRole('alert').allTextContents(),
            })
            if (new URL(page.url()).pathname !== path)
              regressions.push(`${entry.name}: unexpected redirect ${page.url()}`)
            if (overflow.scroll > width)
              regressions.push(`${entry.name}: overflow ${overflow.scroll} > ${width}`)
            for (const violation of axe.filter((v) => v.impact === 'serious' || v.impact === 'critical')) {
              regressions.push(`${entry.name}: axe ${violation.id} (${violation.nodes.length} nodes)`)
            }
            for (const failure of failed) {
              if (!failure.startsWith('404 ') || !known404.has(failure.slice(4)))
                regressions.push(`${entry.name}: ${failure}`)
            }
            for (const error of errors) {
              const knownResourceError =
                error === 'Failed to load resource: the server responded with a status of 404 ()' &&
                failed.some((f) => f.startsWith('404 ') && known404.has(f.slice(4)))
              if (!knownResourceError) regressions.push(`${entry.name}: ${error}`)
            }
            for (const contract of contracts) {
              for (const issue of contract.issues) {
                if (!operationGaps[contract.operation]?.includes(signature(issue))) {
                  regressions.push(`${entry.name}: ${contract.operation} ${JSON.stringify(issue)}`)
                }
              }
            }
            page
              .off('console', onConsole)
              .off('pageerror', onError)
              .off('response', onResponse)
              .off('requestfailed', onFailed)
          }
          await context.close()
        }
        writeFileSync(info.outputPath('audit.json'), JSON.stringify(findings, null, 2))
        await info.attach('route audit', {
          path: info.outputPath('audit.json'),
          contentType: 'application/json',
        })
        expect(regressions, 'New failures; documented backend gaps remain visible in audit.json').toEqual([])
      })
    }
  }
}
