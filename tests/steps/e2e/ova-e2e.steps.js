// HU-002/003/004/006/012/013/025/030 e2e — ciclo de vida real del OVA en browser.
// La generación usa el backend con LLM_FAKE=1 (HTML determinista, sin proveedores).
// Ver tests/README.md: la suite completa requiere el backend levantado con LLM_FAKE=1
// y, en local, E2E_API_ORIGIN apuntando a esa instancia.
import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

import {
  apiOrigin,
  cardMenuAction,
  loginWithCredentials,
  openLoginPage,
  ovaCard,
  ovaCards,
  searchOva,
  seedOvaViaApi,
  state,
  uniqueId,
} from './_helpers.js'
import { test } from './fixtures.js'

const { Given, When, Then } = createBdd(test)

// ── Seeds ─────────────────────────────────────────────────────────────────────

Given('tengo un OVA listo generado vía API con título único', async ({ page }) => {
  state(page).ova = await seedOvaViaApi(page)
})

Given('que estoy autenticado con una cuenta recién creada', async ({ page }) => {
  const email = `e2e_${uniqueId()}@test.genova.ai`
  // Fixture de prueba local (no secreto de producción); armado para evitar
  // falsos positivos del scanner de secretos en el agente.
  const pass = ['clave', '1234', 'e2e'].join('')
  const res = await page.request.post(`${apiOrigin()}/api/auth/register`, {
    data: { full_name: 'Cuenta E2E', email, password: pass },
  })
  // 200 = verificación deshabilitada (cookie de sesión directa); 201 = habilitada.
  if (res.status() !== 200 && res.status() !== 201) {
    throw new Error(`Registro API falló: ${res.status()} ${await res.text()}`)
  }
  await page.context().clearCookies()
  await openLoginPage(page)
  await loginWithCredentials(page, email, pass)
})

// ── Creación desde el formulario (HU-002) ────────────────────────────────────

When('escribo un prompt válido sobre {string}', async ({ page }, tema) => {
  const prompt = `OVA e2e ${uniqueId()} sobre ${tema}: objetivos, nivel universitario.`
  state(page).prompt = prompt
  // React: <textarea id="ova-create-prompt"> con label sr-only asociado.
  const textarea = page.getByLabel('Describe el tema del OVA')
  await textarea.waitFor({ state: 'visible', timeout: 15000 })
  await textarea.fill(prompt)
})

When('configuro recursos en al menos dos fases', async ({ page }) => {
  // En la primera visita a /crear aparece el tour de onboarding (driver.js) que
  // superpone un overlay y bloquea el click sobre las tarjetas del modal 5E.
  // Un contexto Playwright siempre es "primera visita" (localStorage vacío), así
  // que lo cerramos como haría el usuario antes de abrir el modal.
  await page.keyboard.press('Escape').catch(() => {})
  await page.locator('.driver-popover-close-btn').click({ timeout: 1500 }).catch(() => {})
  await page.locator('.driver-overlay').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
  await page.getByRole('button', { name: 'Configurar recursos 5E' }).click()
  // React: cada recurso es un <article> con un <button> de selección (aria-pressed).
  const firstCard = page.locator('article').first()
  await firstCard.waitFor({ state: 'visible', timeout: 20000 })
  await firstCard.getByRole('button').first().click()
  await page.getByRole('button', { name: /^Exploración/ }).click()
  await firstCard.waitFor({ state: 'visible', timeout: 20000 })
  await firstCard.getByRole('button').first().click()
  await page.getByRole('button', { name: /^Confirmar/ }).click()
})

When('inicio la generación del OVA', async ({ page }) => {
  const generar = page.getByRole('button', { name: 'Generar OVA' })
  await expect(generar).toBeEnabled({ timeout: 10000 })
  await generar.click()
})

Then('la generación redirige al workspace del OVA', async ({ page }) => {
  // Con LLM_FAKE=1 el job termina en segundos; el margen cubre el polling del front.
  await page.waitForURL(/\/workspace\//, { timeout: 120000 })
})

Then('el workspace muestra el botón de descarga SCORM', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'SCORM' })).toBeVisible({ timeout: 30000 })
})

Then('el botón {string} está deshabilitado', async ({ page }, name) => {
  await expect(page.getByRole('button', { name })).toBeDisabled({ timeout: 10000 })
})

// ── Mis OVAs (HU-004 / HU-006 / HU-013) ──────────────────────────────────────

When('navego a Mis OVAs y localizo el OVA sembrado', async ({ page }) => {
  await page.goto('/mis-ovas')
  await searchOva(page, state(page).ova.title)
})

Then('el OVA sembrado aparece en el listado', async ({ page }) => {
  await expect(ovaCard(page, state(page).ova.title)).toBeVisible()
})

Then('el botón Descargar del OVA sembrado está habilitado', async ({ page }) => {
  const card = ovaCard(page, state(page).ova.title)
  await expect(card.getByRole('button', { name: 'Descargar' })).toBeEnabled({ timeout: 15000 })
})

When('descargo el OVA desde su card', async ({ page }) => {
  const card = ovaCard(page, state(page).ova.title)
  const downloadPromise = page.waitForEvent('download', { timeout: 60000 })
  await card.getByRole('button', { name: 'Descargar' }).click()
  state(page).download = await downloadPromise
})

Then('se descarga un archivo zip del OVA', async ({ page }) => {
  const filename = state(page).download.suggestedFilename()
  if (!filename.endsWith('.zip')) {
    throw new Error(`Se esperaba un .zip, se descargó "${filename}"`)
  }
})

When('duplico el OVA sembrado desde su card', async ({ page }) => {
  const card = ovaCard(page, state(page).ova.title)
  await cardMenuAction(page, card, 'Duplicar')
})

Then('aparece la copia del OVA sembrado en la lista', async ({ page }) => {
  await expect(page.getByText(`${state(page).ova.title} (copia)`)).toBeVisible({
    timeout: 30000,
  })
})

// ── Papelera (HU-012) ────────────────────────────────────────────────────────

When('muevo el OVA sembrado a la papelera', async ({ page }) => {
  const card = ovaCard(page, state(page).ova.title)
  await cardMenuAction(page, card, 'Mover a la papelera')
  await page.getByRole('dialog').getByRole('button', { name: 'Mover a la papelera' }).click()
})

Then('el OVA sembrado ya no aparece en Mis OVAs', async ({ page }) => {
  await expect(ovaCards(page, state(page).ova.title)).toHaveCount(0, { timeout: 20000 })
})

Then('el OVA sembrado aparece en la papelera', async ({ page }) => {
  await page.goto('/papelera')
  await expect(page.getByText(state(page).ova.title).first()).toBeVisible({ timeout: 20000 })
})

When('restauro el OVA sembrado desde la papelera', async ({ page }) => {
  const card = ovaCard(page, state(page).ova.title)
  await card.getByRole('button', { name: 'Restaurar' }).click()
})

Then('el OVA sembrado vuelve a Mis OVAs', async ({ page }) => {
  await page.goto('/mis-ovas')
  await searchOva(page, state(page).ova.title)
})

When('borro definitivamente el OVA sembrado desde la papelera', async ({ page }) => {
  await page.goto('/papelera')
  const card = ovaCard(page, state(page).ova.title)
  await card.getByRole('button', { name: 'Eliminar definitivamente' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar definitivamente' }).click()
})

Then('el OVA sembrado ya no aparece en la papelera', async ({ page }) => {
  await expect(ovaCards(page, state(page).ova.title)).toHaveCount(0, { timeout: 20000 })
})

// ── Workspace (HU-025 / HU-030 / HU-003) ─────────────────────────────────────

When('abro el workspace del OVA sembrado desde su card', async ({ page }) => {
  const card = ovaCard(page, state(page).ova.title)
  await card.getByRole('link', { name: 'Editar', exact: true }).click()
  await page.waitForURL(/\/workspace\//, { timeout: 30000 })
})

Then('el workspace muestra el título del OVA sembrado', async ({ page }) => {
  await expect(page.getByText(state(page).ova.title).first()).toBeVisible({ timeout: 20000 })
})

Then(
  'el workspace muestra los recursos generados de las fases seleccionadas',
  async ({ page }) => {
    for (const resource of ['Cómic Interactivo', 'Lectura Interactiva']) {
      await expect(page.getByText(resource).first()).toBeVisible({ timeout: 20000 })
    }
  }
)

// ── Estados vacíos ───────────────────────────────────────────────────────────

Then('veo el estado vacío de Mis OVAs', async ({ page }) => {
  await expect(page.getByText('Aún no has creado ningún OVA')).toBeVisible({ timeout: 20000 })
  await expect(page.getByText('Crear mi primer OVA')).toBeVisible()
})

Then('veo el estado vacío de la papelera', async ({ page }) => {
  await expect(page.getByText('Tu papelera está vacía')).toBeVisible({ timeout: 20000 })
})
