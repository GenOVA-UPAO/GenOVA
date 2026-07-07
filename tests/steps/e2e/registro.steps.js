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

Then('debo ver el aviso de verificación de correo', async ({ page }) => {
  await expect(page.getByText('Verifica tu correo')).toBeVisible({ timeout: 15000 })
})

Then('debo ver el error de registro {string}', async ({ page }, msg) => {
  await expect(page.getByText(msg).first()).toBeVisible({ timeout: 10000 })
})

Then('sigo en la página de registro', async ({ page }) => {
  await expect(page).toHaveURL(/register/)
})
