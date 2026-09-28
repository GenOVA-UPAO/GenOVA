// BU-001 / HU-010 / HU-015 e2e — sesión (cookie httpOnly), layout y textos.
import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

import { test } from './fixtures.js'

const { When, Then } = createBdd(test)

When('mi sesión expira', async ({ page }) => {
  // La sesión vive en la cookie httpOnly genova_token; el cache SWR del usuario
  // vive en sessionStorage (me.js). Se purgan ambos para simular la expiración.
  await page.context().clearCookies()
  await page.evaluate(() => window.sessionStorage.clear())
})

Then('debo visualizar la pantalla de inicio de sesión', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible({
    timeout: 15000,
  })
})

Then('debo ver la navegación principal completa', async ({ page }) => {
  for (const label of ['Dashboard', 'Mis OVAs', 'Crear OVA', 'Papelera']) {
    await expect(page.getByRole('link', { name: label }).first()).toBeVisible({ timeout: 15000 })
  }
})

Then('veo la pantalla {string}', async ({ page }, heading) => {
  await expect(page.getByRole('heading', { name: heading })).toBeVisible({ timeout: 15000 })
})

Then('la página muestra el texto {string}', async ({ page }, text) => {
  await expect(page.getByText(text).first()).toBeVisible({ timeout: 15000 })
})
