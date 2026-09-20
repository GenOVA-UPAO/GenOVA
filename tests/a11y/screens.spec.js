// Cobertura axe-core de pantallas completas en escritorio, tema oscuro y móvil.
// El gate de la suite solo falla con violaciones serious/critical; el resto se
// registra en el log (ver a11y-helpers.js).
import { expect, test } from '@playwright/test'

import { ADMIN_STATE, USER_STATE } from './global-setup.js'
import { analyze, applyMode, gotoApp, MODES, seriousViolations } from './a11y-helpers.js'

async function expectNoSerious(page, pantalla) {
  const results = await analyze(page)
  expect(seriousViolations(results), `serious/critical en ${pantalla}`).toEqual([])
}

for (const mode of MODES) {
  test.describe(`Pantallas · ${mode.name}`, () => {
    test.use(mode.mobile ? { viewport: { width: 390, height: 844 } } : {})

    test.beforeEach(async ({ page }) => {
      await applyMode(page, mode)
    })

    test('login no tiene violaciones serias', async ({ page }) => {
      await page.goto('/login', { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { name: 'Iniciar sesión' }).waitFor({ timeout: 15000 })
      await expectNoSerious(page, 'login')
    })

    test('registro no tiene violaciones serias', async ({ page }) => {
      await page.goto('/register', { waitUntil: 'domcontentloaded' })
      await page.getByLabel('Nombre completo').waitFor({ timeout: 15000 })
      await expectNoSerious(page, 'registro')
    })

    test('404 no tiene violaciones serias', async ({ page }) => {
      await page.goto('/ruta-que-no-existe', { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { level: 1, name: '404' }).waitFor({ timeout: 15000 })
      await expectNoSerious(page, '404')
    })

    test.describe('con sesión de usuario', () => {
      test.use({ storageState: USER_STATE })

      test('dashboard no tiene violaciones serias', async ({ page }) => {
        await gotoApp(page, '/dashboard')
        await page.getByRole('heading', { level: 1, name: /Bienvenido/ }).waitFor({ timeout: 15000 })
        await expectNoSerious(page, 'dashboard')
      })

      test('mis OVAs no tiene violaciones serias', async ({ page }) => {
        await gotoApp(page, '/mis-ovas', 'Biblioteca de OVAs')
        await expectNoSerious(page, 'mis OVAs')
      })

      test('papelera no tiene violaciones serias', async ({ page }) => {
        await gotoApp(page, '/papelera', 'Papelera')
        await expectNoSerious(page, 'papelera')
      })
    })

    test.describe('con sesión de administrador', () => {
      test.use({ storageState: ADMIN_STATE })

      test('analítica no tiene violaciones serias', async ({ page }) => {
        await gotoApp(page, '/analytics', 'Analítica de aprendizaje')
        await expectNoSerious(page, 'analítica')
      })

      test('perfil (tres pestañas) no tiene violaciones serias', async ({ page }) => {
        await gotoApp(page, '/profile')
        for (const tab of ['Información', 'Configuración', 'Seguridad']) {
          await page.getByRole('tab', { name: tab }).click()
          await expectNoSerious(page, `perfil · ${tab}`)
        }
      })

      test('modelos de IA (tres pestañas) no tiene violaciones serias', async ({ page }) => {
        await gotoApp(page, '/models', 'Modelos de IA')
        for (const tab of ['Modelos', 'Credenciales', 'Plataforma']) {
          await page.getByRole('tab', { name: tab }).click()
          await expectNoSerious(page, `modelos · ${tab}`)
        }
      })

      test('admin usuarios no tiene violaciones serias', async ({ page }) => {
        await gotoApp(page, '/admin', 'Usuarios')
        await expectNoSerious(page, 'admin usuarios')
      })

      test('admin roles no tiene violaciones serias', async ({ page }) => {
        await gotoApp(page, '/admin/roles', 'Gestión de Roles')
        await expectNoSerious(page, 'admin roles')
      })
    })
  })
}
