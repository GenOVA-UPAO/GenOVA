// HU-001 e2e — steps ejecutables del formulario real de /register.
import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

import { uniqueId } from './_helpers.js'

const { When, Then } = createBdd()

async function fillRegister(page, name, email, password) {
  await page.locator('#fullName').waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('#fullName').fill(name)
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
}

When(
  'completo el registro con nombre {string}, correo único y contraseña {string}',
  async ({ page }, name, password) => {
    await fillRegister(page, name, `e2e_${uniqueId()}@test.genova.ai`, password)
  }
)

When(
  'completo el registro con nombre {string}, correo {string} y contraseña {string}',
  async ({ page }, name, email, password) => {
    await fillRegister(page, name, email, password)
  }
)

Then('el registro se completa con aviso de verificación o sesión iniciada', async ({ page }) => {
  // EMAIL_VERIFICATION_ENABLED=1 → aviso "Verifica tu correo" (201).
  // Deshabilitada (default) → cookie de sesión directa y redirect al dashboard (200).
  await Promise.any([
    page.getByText('Verifica tu correo').waitFor({ state: 'visible', timeout: 20000 }),
    page.waitForURL(/dashboard|mis-ovas/, { timeout: 20000 }),
  ])
})

Then('debo ver el error de registro {string}', async ({ page }, msg) => {
  await expect(page.getByText(msg).first()).toBeVisible({ timeout: 10000 })
})

Then('sigo en la página de registro', async ({ page }) => {
  await expect(page).toHaveURL(/register/)
})
