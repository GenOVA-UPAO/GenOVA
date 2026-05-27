import { defineConfig } from '@playwright/test'
import { defineBddConfig } from 'playwright-bdd'

// Paths are relative to this config file's directory (tests/)
const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: 'steps/e2e/**/*.js',
})

export default defineConfig({
  testDir,
  timeout: 30000,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: [['html', { outputFolder: 'playwright-report' }]],
  webServer: {
    command: 'pnpm --filter frontend dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
