import { defineConfig } from '@playwright/test'
import { defineBddConfig } from 'playwright-bdd'

// E2E_EXTERNAL=1 → corre contra un deploy real (Vercel/Railway develop): no se
// levanta webServer y se envía el header de bypass de Vercel Deployment Protection.
// BDD_TAGS filtra escenarios por tag Gherkin (p.ej. "@smoke" contra develop).
const external = process.env.E2E_EXTERNAL === '1'

// Paths are relative to this config file's directory (tests/)
const testDir = defineBddConfig({
  features: [
    // Features verbatim de specs que son ejecutables tal cual
    'features/auth/HU-008_login.feature',
    'features/roles/HU-018_crear-rol.feature',
    // Suite e2e ejecutable (escenarios reales por HU; ver features/e2e/*.feature)
    'features/e2e/*.feature',
  ],
  steps: 'steps/e2e/**/*.js',
  tags: process.env.BDD_TAGS || undefined,
})

export default defineConfig({
  testDir,
  timeout: 180000,
  workers: process.env.CI ? 2 : 1,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4200',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    ...(external && {
      extraHTTPHeaders: {
        'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? '',
        'x-vercel-set-bypass-cookie': 'true',
      },
    }),
  },
  reporter: [['html', { outputFolder: 'playwright-report' }]],
  webServer: external
    ? undefined
    : {
        command: 'pnpm --filter frontend dev',
        url: 'http://localhost:4200',
        reuseExistingServer: !process.env.CI,
        // Angular CLI honors process.env.PORT; pin 4200 when backend sets PORT=8000 locally
        env: { PORT: '4200' },
        timeout: 120000,
      },
})
