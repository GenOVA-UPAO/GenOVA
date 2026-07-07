import { defineConfig } from '@playwright/test'

// Config mínima para la auditoría axe-core (specs planos, sin BDD).
// Reusa el mismo webServer/baseURL que la suite e2e principal.
export default defineConfig({
  testDir: './a11y',
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4200',
    screenshot: 'only-on-failure',
  },
  reporter: [['html', { outputFolder: 'playwright-report-a11y' }]],
  webServer: {
    command: 'pnpm --filter frontend dev',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    env: { PORT: '4200' },
    timeout: 120000,
  },
})
