// HU-002/003/004/006/012/013/025/030 e2e — ciclo de vida real del OVA en browser.
// La generación usa el backend con LLM_FAKE=1 (HTML determinista, sin proveedores).
import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

import { ovaCard, ovaCards, searchOva, seedOvaViaApi, state, uniqueId } from './_helpers.js'

const { Given, When, Then } = createBdd()

// ── Seeds ─────────────────────────────────────────────────────────────────────

Given('tengo un OVA listo generado vía API con título único', async ({ page }) => {
  state(page).ova = await seedOvaViaApi(page)
})

Given('que estoy autenticado con una cuenta recién creada', async ({ page }) => {
  const email = `e2e_${uniqueId()}@test.genova.ai`
  const password = 'clave1234e2e'
  const res = await page.request.post('/api/auth/register', {
    data: { full_name: 'Cuenta E2E', email, password },
  })
  // 200 = verificación deshabilitada (cookie de sesión directa); 201 = habilitada.
  if (res.status() !== 200 && res.status() !== 201) {
    throw new Error(`Registro API falló: ${res.status()} ${await res.text()}`)
  }
  await page.context().clearCookies()
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.locator('#email, input[type=email]').first().fill(email)
  await page.locator('#password input, input[type=password]').first().fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(/dashboard|mis-ovas/, { timeout: 20000 })
})

// ── Creación desde el formulario (HU-002) ────────────────────────────────────

When('escribo un prompt válido sobre {string}', async ({ page }, tema) => {
  const prompt = `OVA e2e ${uniqueId()} sobre ${tema}: objetivos, nivel universitario.`
  state(page).prompt = prompt
  const textarea = page.locator('textarea').first()
  await textarea.waitFor({ state: 'visible', timeout: 15000 })
  await textarea.fill(prompt)
})

When('configuro recursos en al menos dos fases', async ({ page }) => {
  // El botón dejó de ser el glifo "⚙": ahora es gn-icon "gear" con
  // ariaLabel "Configurar recursos 5E" (consolidación de íconos).
  await page.getByRole('button', { name: 'Configurar recursos 5E' }).click()
  const firstCard = page.locator('gn-resource-card').first()
  await firstCard.waitFor({ state: 'visible', timeout: 20000 })
  await firstCard.click()
  await page.getByRole('button', { name: 'EXPLORE' }).click()
  await firstCard.waitFor({ state: 'visible', timeout: 20000 })
  await firstCard.click()
  await page.getByRole('button', { name: 'Confirmar' }).click()
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
  await card.getByRole('button', { name: 'Duplicar' }).click()
})

Then('aparece la copia del OVA sembrado en la lista', async ({ page }) => {
  await expect(page.getByText(`${state(page).ova.title} (copia)`)).toBeVisible({
    timeout: 30000,
  })
})

// ── Papelera (HU-012) ────────────────────────────────────────────────────────

When('muevo el OVA sembrado a la papelera', async ({ page }) => {
  const card = ovaCard(page, state(page).ova.title)
  await card.getByRole('button', { name: 'Papelera' }).click()
  await page.getByRole('button', { name: 'Mover', exact: true }).click()
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
  await card.getByRole('button', { name: 'Borrar definitivamente' }).click()
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click()
})

Then('el OVA sembrado ya no aparece en la papelera', async ({ page }) => {
  await expect(ovaCards(page, state(page).ova.title)).toHaveCount(0, { timeout: 20000 })
})

// ── Workspace (HU-025 / HU-030 / HU-003) ─────────────────────────────────────

When('abro el workspace del OVA sembrado desde su card', async ({ page }) => {
  const card = ovaCard(page, state(page).ova.title)
  await card.getByRole('button', { name: 'Editar' }).click()
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
