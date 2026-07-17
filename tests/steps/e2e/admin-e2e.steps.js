// HU-019/020/021 e2e — gestión de roles y usuarios del panel de administración.
import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

import { state, uniqueId } from './_helpers.js'

const { Given, When, Then } = createBdd()

const roleCard = (page, name) => page.locator('.glass-card').filter({ hasText: name }).first()

// ── Roles (HU-019 / HU-020) ──────────────────────────────────────────────────

Given('creo un rol único desde la interfaz', async ({ page }) => {
  const name = `rol-e2e-${uniqueId()}`
  state(page).roleName = name
  await page.getByRole('button', { name: 'Nuevo rol' }).click()
  await page.locator('#role-name-input').fill(name)
  await page.getByRole('button', { name: 'Crear rol' }).click()
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 20000 })
})

When('renombro ese rol añadiendo el sufijo {string}', async ({ page }, suffix) => {
  const oldName = state(page).roleName
  const newName = `${oldName}${suffix}`
  await roleCard(page, oldName).getByRole('button', { name: 'Editar permisos' }).click()
  await page.locator('#role-name-input').fill(newName)
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  state(page).roleName = newName
})

Then('el rol renombrado aparece en la lista', async ({ page }) => {
  await expect(page.getByText(state(page).roleName).first()).toBeVisible({ timeout: 20000 })
})

When('elimino ese rol desde la interfaz', async ({ page }) => {
  await roleCard(page, state(page).roleName).getByRole('button', { name: 'Eliminar' }).click()
  await page.getByRole('button', { name: 'Eliminar rol' }).click()
})

Then('ese rol desaparece de la lista', async ({ page }) => {
  await expect(page.getByText(state(page).roleName)).toHaveCount(0, { timeout: 20000 })
})

Then('los roles del sistema muestran la etiqueta {string}', async ({ page }, label) => {
  // "administrador" y "usuario" son roles de sistema: al menos 2 badges visibles.
  await expect(page.getByText(label, { exact: true }).nth(1)).toBeVisible({ timeout: 20000 })
})

// ── Usuarios (HU-021) ────────────────────────────────────────────────────────

Then('veo la pantalla de gestión de usuarios', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible({ timeout: 20000 })
})

When('busco el usuario {string} en la gestión de usuarios', async ({ page }, email) => {
  // El <input> real por rol (el host gn-search-input también refleja placeholder).
  const search = page.getByRole('textbox', { name: /Buscar por nombre o email/i })
  await search.waitFor({ state: 'visible', timeout: 15000 })
  await search.fill(email)
})

Then('la lista de usuarios muestra a {string}', async ({ page }, email) => {
  await expect(page.getByText(email).first()).toBeVisible({ timeout: 20000 })
})
