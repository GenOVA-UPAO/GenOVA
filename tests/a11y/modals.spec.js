// Auditoría axe-core de los modales principales (metadatos, confirmar papelera,
// editar usuario y catálogo de modelos) en escritorio, oscuro y móvil.
import { expect, test } from '@playwright/test'

import { ADMIN_STATE, USER_STATE } from './global-setup.js'
import { analyze, applyMode, closeDialog, gotoApp, MODES, openDialog, seriousViolations } from './a11y-helpers.js'

async function expectNoSerious(page, pantalla) {
  const results = await analyze(page)
  expect(seriousViolations(results), `serious/critical en ${pantalla}`).toEqual([])
}

/** Primer botón habilitado con ese texto exacto (evita tarjetas generando). */
function enabledButton(page, name) {
  return page.locator('button:not([disabled])').filter({ hasText: name }).first()
}

/** Abre el catálogo de modelos y espera a que monte. */
async function openCatalog(page) {
  await page.getByRole('button', { name: 'Abrir catálogo' }).click()
  await page.getByRole('heading', { name: 'Gestionar modelos' }).waitFor({ timeout: 10000 })
}

for (const mode of MODES) {
  test.describe(`Modales · ${mode.name}`, () => {
    test.use(mode.mobile ? { viewport: { width: 390, height: 844 } } : {})

    test.beforeEach(async ({ page }) => {
      await applyMode(page, mode)
    })

    test.describe('con sesión de usuario', () => {
      test.use({ storageState: USER_STATE })

      test('modal de metadatos no tiene violaciones serias', async ({ page }) => {
        await gotoApp(page, '/mis-ovas', 'Biblioteca de OVAs')
        await enabledButton(page, 'Metadatos').click()
        await openDialog(page)
        await expectNoSerious(page, 'modal metadatos')
        await closeDialog(page)
      })

      test('modal de confirmar papelera no tiene violaciones serias', async ({ page }) => {
        await gotoApp(page, '/mis-ovas', 'Biblioteca de OVAs')
        await enabledButton(page, 'A papelera').click()
        await openDialog(page)
        await expectNoSerious(page, 'modal confirmar papelera')
        await closeDialog(page)
      })
    })

    test.describe('con sesión de administrador', () => {
      test.use({ storageState: ADMIN_STATE })

      test('modal de editar usuario no tiene violaciones serias', async ({ page }) => {
        await gotoApp(page, '/admin', 'Usuarios')
        await page.getByRole('button', { name: /Acción/ }).first().click()
        await page.getByRole('menuitem', { name: 'Editar Perfil' }).click()
        await openDialog(page)
        await expectNoSerious(page, 'modal editar usuario')
        await closeDialog(page)
      })

      test('modal de catálogo de modelos no tiene violaciones serias', async ({ page }) => {
        await gotoApp(page, '/models', 'Modelos de IA')
        await openCatalog(page)
        await expectNoSerious(page, 'modal catálogo de modelos')
        // Si otro agente guarda un archivo, el HMR recarga y cierra el modal:
        // se reabre antes de cerrar para no fallar por una recarga ajena.
        if ((await page.getByRole('button', { name: 'Cerrar', exact: true }).count()) === 0) {
          await openCatalog(page)
        }
        await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
        await page.getByRole('heading', { name: 'Gestionar modelos' }).waitFor({ state: 'detached' })
      })
    })
  })
}
