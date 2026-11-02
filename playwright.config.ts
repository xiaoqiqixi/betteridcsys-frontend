import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 4,
  retries: 0,
  forbidOnly: !!process.env.CI,
  globalSetup: './tests/e2e/setup.ts',
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'artifacts/e2e/results.json' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://localhost:5178',
    browserName: 'chromium',
    channel: 'chromium',
    ignoreHTTPSErrors: true,
    actionTimeout: 10_000,
    trace: 'retain-on-failure',
    screenshot: 'off',
  },
  projects: [
    { name: 'flows', testMatch: 'flows.spec.ts' },
    { name: 'audit', testMatch: 'audit.spec.ts', fullyParallel: true, dependencies: ['flows'] },
    { name: 'production', testMatch: 'production.spec.ts', use: { baseURL: 'https://localhost:5179' } },
  ],
  webServer: [
    {
      command: 'npm run dev -- --port 5178 --strictPort',
      url: 'https://localhost:5178',
      ignoreHTTPSErrors: true,
      reuseExistingServer: !process.env.CI,
      env: { LOCAL_HTTPS: '1', API_PROXY_TARGET: 'http://127.0.0.1:18080' },
    },
    {
      command: 'npm run preview -- --port 5179 --strictPort',
      url: 'https://localhost:5179',
      ignoreHTTPSErrors: true,
      reuseExistingServer: !process.env.CI,
      env: { LOCAL_HTTPS: '1', API_PROXY_TARGET: 'http://127.0.0.1:18080', API_PROXY_HOST: 'localhost:5178' },
    },
  ],
})
