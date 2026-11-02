import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

for (const locale of ['en', 'zh-CN']) {
  test(`production homepage: ${locale}, real loaded JS budget and menu keyboard access`, async ({
    page,
  }, info) => {
    const loaded = new Set<string>()
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('response', (response) => {
      const path = new URL(response.url()).pathname
      if (path.endsWith('.js')) loaded.add(path)
    })
    await page.addInitScript((locale) => {
      if (!localStorage.getItem('bis.prefs.v1'))
        localStorage.setItem('bis.prefs.v1', JSON.stringify({ locale, theme: 'light' }))
    }, locale)
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', locale)
    await expect(page.getByRole('main').locator('h1')).toBeVisible()
    await page.waitForLoadState('networkidle')
    const gzipBytes = [...loaded].reduce(
      (total, path) => total + gzipSync(readFileSync(resolve('dist', '.' + path)), { level: 6 }).length,
      0,
    )
    await info.attach('actual initial JS', {
      body: JSON.stringify({ locale, gzipBytes, files: [...loaded] }, null, 2),
      contentType: 'application/json',
    })
    expect(gzipBytes).toBeLessThanOrEqual(180_000)
    expect([...loaded].some((path) => path.includes('admin-endpoints') || path.includes('-private-'))).toBe(
      false,
    )
    const language = page.getByRole('button', { name: locale === 'en' ? 'Language' : '语言', exact: true })
    await language.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('menu')).toBeVisible()
    await expect(page.getByRole('menu').locator(':focus')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(language).toBeFocused()
    await language.click()
    await page.getByRole('menuitem', { name: locale === 'en' ? '简体中文' : 'English', exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', locale === 'en' ? 'zh-CN' : 'en')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', locale === 'en' ? 'zh-CN' : 'en')
    expect(errors).toEqual([])
  })
}
