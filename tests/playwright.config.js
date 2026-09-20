import { defineConfig } from '@playwright/test'
import { defineBddConfig } from 'playwright-bdd'

// E2E_EXTERNAL=1 → no levanta webServer (frontend ya fuera, p.ej. Vite en :4300
// o un deploy Vercel). El header de bypass de Vercel Deployment Protection
// SOLO se envía si existe el secret: contra un backend local esas cabeceras
// no están en CORS allow_headers y el preflight de /api/auth/me cae en 400.
const external = process.env.E2E_EXTERNAL === '1'
const vercelBypass = (process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? '').trim()

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
    // Cada escenario deja su grabación en tests/test-results/<escenario>/video.webm:
    // es la evidencia que acompaña al reporte de pruebas e2e. En CI se conserva
    // solo la de los fallos para no inflar los artefactos de cada corrida.
    video: process.env.CI ? 'retain-on-failure' : 'on',
    ...(vercelBypass && {
      extraHTTPHeaders: {
        'x-vercel-protection-bypass': vercelBypass,
        'x-vercel-set-bypass-cookie': 'true',
      },
    }),
  },
  reporter: [['html', { outputFolder: 'playwright-report' }]],
  webServer: external
    ? undefined
      : {
        // Vite (`frontend` → `vite`), no `ng serve`. Cwd = raíz del monorepo
        // para que `pnpm --filter` resuelva el workspace desde CI y local.
        command: 'pnpm --filter frontend dev',
        cwd: '..',
        url: 'http://localhost:4200',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
})
