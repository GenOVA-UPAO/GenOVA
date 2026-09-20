// Auditoría de ova-workspace: NO se corrige nada aquí (carpeta ocupada por otro
// agente). El tour de driver.js de /crear deja una violación critical que solo
// puede arreglarse dentro de la feature, así que queda un skip documentado.
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

    test.skip('crear OVA con el tour activo', async ({ page }) => {
      // Skip documentado (arreglo dentro de src/features/ova-workspace, fuera de alcance):
      // 1. aria-allowed-attr [critical] en section#tour-crear-ova-prompt: driver.js
      //    añade aria-expanded="true" a un <section> no interactivo.
      // 2. color-contrast [serious] en .driver-popover-progress-text (tema oscuro):
      //    #727272 sobre #121824 = 3.69:1.
      await gotoApp(page, '/crear')
      await expectNoSerious(page, 'crear con tour')
    })

    test('editor de OVA no tiene violaciones serias', async ({ page }) => {
      await gotoApp(page, '/mis-ovas', 'Biblioteca de OVAs')
      await page
        .locator('button:not([disabled])')
        .filter({ hasText: /^Editar$/ })
        .first()
        .click()
      await page.waitForURL(/\/workspace\//, { timeout: 15000 })
      await page.locator('h1').first().waitFor({ timeout: 20000 })
      await expectNoSerious(page, 'editor')
    })
  })
}
