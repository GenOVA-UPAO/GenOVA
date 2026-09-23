// Auditoría de ova-workspace. El tour de driver.js dejaba dos violaciones
// (aria-expanded sobre un <section> y el contador sin contraste); ya corregidas
// en la feature, así que el escenario con el tour activo vuelve a auditarse.
import { expect, test } from '@playwright/test'

import { USER_STATE } from './global-setup.js'
import { analyze, applyMode, gotoApp, MODES, seriousViolations } from './a11y-helpers.js'

test.use({ storageState: USER_STATE })

async function expectNoSerious(page, pantalla) {
  const results = await analyze(page)
  expect(seriousViolations(results), `serious/critical en ${pantalla}`).toEqual([])
}

/** Marca el tour de /crear como visto para el usuario de la sesión. */
async function skipTour(page) {
  const res = await page.request.get('/api/auth/me')
  const me = res.ok() ? await res.json() : null
  const userId = String(me?.id ?? 'anonymous')
  await page.addInitScript((uid) => {
    localStorage.setItem(`genova.crear-ova.tour.done.${uid}`, '1')
  }, userId)
}

for (const mode of MODES) {
  test.describe(`ova-workspace · ${mode.name} (solo lectura)`, () => {
    test.use(mode.mobile ? { viewport: { width: 390, height: 844 } } : {})

    test.beforeEach(async ({ page }) => {
      await applyMode(page, mode)
    })

    test('crear OVA sin el tour no tiene violaciones serias', async ({ page }) => {
      await skipTour(page)
      await gotoApp(page, '/crear')
      await expectNoSerious(page, 'crear')
    })

    test('crear OVA con el tour activo', async ({ page }) => {
      // Regresión: driver.js ponía aria-expanded en section#tour-crear-ova-prompt
      // (aria-allowed-attr, critical) y el contador del popover se quedaba en
      // 3.69:1 sobre el tema oscuro.
      await gotoApp(page, '/crear')
      await expectNoSerious(page, 'crear con tour')
    })

    test('editor de OVA no tiene violaciones serias', async ({ page }) => {
      await gotoApp(page, '/mis-ovas', 'Biblioteca de OVAs')
      await page.getByRole('link', { name: 'Editar', exact: true }).first().click()
      await page.waitForURL(/\/workspace\//, { timeout: 15000 })
      await page.locator('h1').first().waitFor({ timeout: 20000 })
      await expectNoSerious(page, 'editor')
    })
  })
}
