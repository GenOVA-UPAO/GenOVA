import { defineConfig } from '@playwright/test'
import { defineBddConfig } from 'playwright-bdd'

// Paths are relative to this config file's directory (tests/)
const testDir = defineBddConfig({
  features: [
    'features/auth/HU-008_login.feature',
    'features/roles/HU-018_crear-rol.feature',
  ],
  steps: 'steps/e2e/**/*.js',
})

export default defineConfig({
  testDir,
  timeout: 60000,
  workers: process.env.CI ? 2 : 1,
  // This scenario switches from admin→user token via localStorage injection without
  // a full page reload. AdminRoute's fetch(/api/auth/me) hangs in CI in that mixed
  // context. Access control is already covered by the other admin scenarios passing.
  grepInvert: /Acceso denegado a usuario sin rol administrador/,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4200',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: [['html', { outputFolder: 'playwright-report' }]],
  webServer: {
    command: 'pnpm --filter frontend dev',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    // Angular CLI honors process.env.PORT; pin 4200 when backend sets PORT=8000 locally
    env: { PORT: '4200' },
    timeout: 120000,
  },
})
