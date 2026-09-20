// Humo original de la suite (login/registro/dashboard/mis OVAs en escritorio).
// La cobertura completa por pantalla, modal, tema y viewport vive en
// screens.spec.js y modals.spec.js.
import { expect, test } from '@playwright/test'

import { USER_STATE } from './global-setup.js'
import { analyze, gotoApp, seriousViolations } from './a11y-helpers.js'

async function expectNoSerious(page) {
  const results = await analyze(page)
  expect(seriousViolations(results)).toEqual([])
}

test.describe('Accesibilidad (axe-core, WCAG 2.0 A/AA)', () => {
  test('login no tiene violaciones serias', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Iniciar sesión' }).waitFor({ timeout: 15000 })
    await expectNoSerious(page)
  })

  test('registro no tiene violaciones serias', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Nombre completo').waitFor({ timeout: 15000 })
    await expectNoSerious(page)
  })

  test.describe('con sesión de usuario', () => {
    test.use({ storageState: USER_STATE })

    test('dashboard no tiene violaciones serias', async ({ page }) => {
      await gotoApp(page, '/dashboard')
      await page.getByRole('heading', { level: 1, name: /Bienvenido/ }).waitFor({ timeout: 15000 })
      await expectNoSerious(page)
    })

    test('mis OVAs no tiene violaciones serias', async ({ page }) => {
      await gotoApp(page, '/mis-ovas', 'Biblioteca de OVAs')
      await expectNoSerious(page)
    })
  })
})
