// FP-001..006 e2e — flujos principales: editor, exportar, área temática, reintento
// y metadatos. Todo con backend LLM_FAKE=1 (ver tests/README.md). Las esperas son
// aserciones con auto-wait (expect / expect.poll), sin pausas fijas.
import { readFile, stat } from 'node:fs/promises'

import { expect } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

import {
  apiOrigin,
  cardMenuAction,
  originHeaders,
  ovaCard,
  searchOva,
  state,
  uniqueId,
} from './_helpers.js'
import { test } from './fixtures.js'

const { Given, When, Then, After } = createBdd(test)

const FAKE_EDIT_MARK = 'data-llm-fake-edit'
const PLACEHOLDER_PREFIX = '[Generado con prompt:'

/** OVA del editor (GET /api/ovas/{id}/editar): versión actual con sus fases. */
async function fetchEditable(page) {
  const { ovaId } = state(page).ova
  const res = await page.request.get(`${apiOrigin()}/api/ovas/${ovaId}/editar`)
  expect(res.ok(), `GET /editar → ${res.status()}`).toBe(true)
  return res.json()
}

const phaseTitled = (data, title) =>
  data.current_version.phases.find((p) => p.title.toLowerCase() === title.toLowerCase())

// ── Editor (FP-001) ──────────────────────────────────────────────────────────

Given('abro el workspace del OVA sembrado', async ({ page }) => {
  const { ovaId, title } = state(page).ova
  await page.goto(`/workspace/${ovaId}`)
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible({ timeout: 30000 })
})

Then('el editor muestra el título del OVA sembrado en la versión {int}', async ({ page }, version) => {
  await expect(page.getByRole('heading', { name: state(page).ova.title, level: 1 })).toBeVisible()
  await expect(page.getByText(`v${version}`, { exact: true })).toBeVisible()
})

Then('la vista previa lista los recursos {string} y {string}', async ({ page }, first, second) => {
  const nav = page.getByRole('navigation', { name: 'Recursos del OVA' })
  await expect(nav.getByRole('button', { name: first })).toBeVisible({ timeout: 20000 })
  await expect(nav.getByRole('button', { name: second })).toBeVisible()
  await expect(page.getByRole('tabpanel', { name: 'Vista previa' }).locator('iframe')).toBeVisible()
})

When('abro la pestaña «Editar» del editor', async ({ page }) => {
  await page.getByRole('tab', { name: 'Editar' }).click()
  await expect(page.getByRole('tabpanel', { name: 'Editar' })).toBeVisible()
})

Then('el editor tiene una sección por fase con sus recursos', async ({ page }) => {
  const panel = page.getByRole('tabpanel', { name: 'Editar' })
  await expect(panel.getByRole('heading', { name: /^Enganche/, level: 2 })).toBeVisible()
  await expect(panel.getByRole('heading', { name: /^Exploración/, level: 2 })).toBeVisible()
  await expect(panel.getByRole('heading', { name: 'Cómic interactivo', level: 3 })).toBeVisible()
  await expect(panel.getByRole('heading', { name: 'Lectura interactiva', level: 3 })).toBeVisible()
})

When('marco solo el recurso {string} en «Aplicar a»', async ({ page }, resource) => {
  await page.getByRole('button', { name: /^Aplicar a:/ }).click()
  const group = page.getByRole('group', { name: 'Recursos a regenerar' })
  await group.getByRole('checkbox', { name: resource }).check()
  await expect(page.getByRole('button', { name: 'Aplicar a: 1 recurso' })).toBeVisible()
})

When('aplico la instrucción {string}', async ({ page }, instruction) => {
  state(page).instruction = instruction
  await page.getByRole('textbox', { name: 'Describe los cambios que deseas' }).fill(instruction)
  await page.getByRole('button', { name: 'Aplicar cambios' }).click()
})

Then('el OVA pasa a la versión {int}', async ({ page }, version) => {
  await expect
    .poll(async () => (await fetchEditable(page)).current_version.version_number, { timeout: 90000 })
    .toBe(version)
  await expect(page.getByText(`v${version}`, { exact: true })).toBeVisible({ timeout: 30000 })
})

Then('solo el recurso {string} contiene el cambio pedido', async ({ page }, title) => {
  const data = await fetchEditable(page)
  for (const phase of data.current_version.phases) {
    const edited = phase.content.includes(FAKE_EDIT_MARK)
    expect(edited, `¿"${phase.title}" editado?`).toBe(phase.title === title)
  }
  expect(phaseTitled(data, title).content).toContain(state(page).instruction)
})

Then('el chat indica que se aplicó a {string}', async ({ page }, resource) => {
  await expect(page.getByText(`Aplicado a: ${resource}`)).toBeVisible({ timeout: 20000 })
})

When('regenero el recurso {string} desde la pestaña «Editar»', async ({ page }, resource) => {
  await page.getByRole('tab', { name: 'Editar' }).click()
  const article = page.getByRole('article').filter({
    has: page.getByRole('heading', { name: resource, level: 3 }),
  })
  await article.getByRole('button', { name: 'Regenerar recurso' }).click()
  const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'))
  await dialog.getByRole('button', { name: 'Regenerar recurso' }).click()
})

Then('solo el recurso {string} figura como regenerado', async ({ page }, title) => {
  const data = await fetchEditable(page)
  for (const phase of data.current_version.phases) {
    expect(phase.regenerated, `¿"${phase.title}" regenerado?`).toBe(phase.title === title)
  }
})

When(
  'añado a la fase {string} un recurso con la instrucción {string}',
  async ({ page }, phase, instruction) => {
    await page.getByRole('tab', { name: 'Editar' }).click()
    await page.getByRole('button', { name: `Añadir recurso a ${phase}` }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Instrucciones').fill(instruction)
    await dialog.getByRole('button', { name: 'Añadir recurso' }).click()
  },
)

Then('la fase {string} muestra {int} recursos', async ({ page }, phase, count) => {
  await expect(
    page.getByRole('heading', { name: new RegExp(`^${phase} ${count} de \\d+ recursos`), level: 2 }),
  ).toBeVisible({ timeout: 30000 })
})

Then('el recurso añadido se genera y ya no es un marcador pendiente', async ({ page }) => {
  await expect
    .poll(
      async () => {
        const phases = (await fetchEditable(page)).current_version.phases
        return phases.length === 3 && phases.every((p) => !p.content.startsWith(PLACEHOLDER_PREFIX))
      },
      { timeout: 90000 },
    )
    .toBe(true)
})

When('cancelo la regeneración en curso', async ({ page }) => {
  const panel = page.getByRole('complementary', { name: 'Panel de instrucciones' })
  await panel.getByRole('button', { name: 'Cancelar', exact: true }).click()
})

Then('el chat avisa que la regeneración se canceló sin aplicar cambios', async ({ page }) => {
  await expect(page.getByText(/Regeneración cancelada\. No se aplicó ningún cambio/).first()).toBeVisible({
    timeout: 30000,
  })
})

Then('el OVA sigue en la versión {int} sin el cambio pedido', async ({ page }, version) => {
  // La llamada ya en vuelo termina sola (unos segundos) y su resultado se descarta:
  // se espera a que el OVA vuelva a «listo» y entonces se comprueba que no cambió.
  await expect.poll(async () => (await fetchEditable(page)).status, { timeout: 60000 }).toBe('listo')
  const data = await fetchEditable(page)
  expect(data.current_version.version_number).toBe(version)
  for (const phase of data.current_version.phases) expect(phase.content).not.toContain(FAKE_EDIT_MARK)
})

// ── Exportar (FP-002) ────────────────────────────────────────────────────────

const escapeRegExp = (text) => text.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')

When('descargo el OVA desde el editor como {string}', async ({ page }, format) => {
  const downloadPromise = page.waitForEvent('download', { timeout: 90000 })
  await page.getByRole('button', { name: 'Elegir formato de descarga' }).click()
  await page.getByRole('menuitem', { name: new RegExp(`^${escapeRegExp(format)}`) }).click()
  state(page).download = await downloadPromise
})

Then('el archivo descargado termina en {string} y no está vacío', async ({ page }, extension) => {
  const download = state(page).download
  expect(download.suggestedFilename()).toMatch(new RegExp(`${escapeRegExp(extension)}$`))
  const path = await download.path()
  expect((await stat(path)).size).toBeGreaterThan(0)
})

Then('el archivo descargado es un contenedor zip válido', async ({ page }) => {
  const bytes = await readFile(await state(page).download.path())
  // «PK\x03\x04»: cabecera local de un zip (SCORM, IMS, HTML, EPUB, elpx y H5P lo son).
  expect([...bytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04])
})

// ── Área temática (FP-004) ───────────────────────────────────────────────────

When(
  'activo el área temática {string} en la configuración de la plataforma',
  async ({ page }, area) => {
    await page.goto('/models')
    await page.getByRole('tab', { name: 'Plataforma' }).click()
    const toggle = page.getByRole('switch', { name: 'Área temática de los OVAs' })
    await expect(toggle).toBeVisible({ timeout: 20000 })
    if ((await toggle.getAttribute('aria-checked')) !== 'true') await toggle.click()
    await page.getByLabel('Área permitida').fill(area)
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Guardrails guardados.').first()).toBeVisible({ timeout: 20000 })
  },
)

Then('Crear OVA muestra la nota del área {string}', async ({ page }, area) => {
  await expect(page.getByTestId('topic-area-note')).toContainText(`«${area}»`, { timeout: 20000 })
})

Then('veo el rechazo por prompt fuera del área {string}', async ({ page }, area) => {
  await expect(
    page.getByText(`El prompt no pertenece al área temática permitida (${area})`).first(),
  ).toBeVisible({ timeout: 20000 })
  await expect(page).toHaveURL(/\/crear/)
})

// El área es configuración global: se deja siempre desactivada, pase lo que pase.
After({ tags: '@global-config' }, async ({ page }) => {
  const res = await page.request.put(`${apiOrigin()}/api/admin/guardrails`, {
    headers: originHeaders(page),
    data: { guardrail_topic_enabled: '0', guardrail_topic_area: '' },
  })
  expect(res.ok(), `restaurar guardrails → ${res.status()}`).toBe(true)
})

// ── Reintento de generación (FP-005) ─────────────────────────────────────────

Given('tengo un OVA cuya generación falló vía API', async ({ page }) => {
  const title = `OVA e2e ${uniqueId()} [fallo-e2e]`
  const res = await page.request.post(`${apiOrigin()}/api/jobs`, {
    headers: originHeaders(page),
    data: {
      prompt: title,
      resources: [
        { phase_type: 'engage', resource_type: 'Cómic Interactivo' },
        { phase_type: 'explore', resource_type: 'Lectura Interactiva' },
      ],
    },
  })
  expect(res.status(), await res.text()).toBe(202)
  const { job_id: jobId } = await res.json()
  await expect
    .poll(async () => (await (await page.request.get(`${apiOrigin()}/api/jobs/${jobId}`)).json()).status, {
      timeout: 90000,
      intervals: [1000],
    })
    .toBe('error')
  state(page).ova = { title, jobId }
})

Then(
  'la card del OVA sembrado ofrece «Reintentar generación» y está en estado de error',
  async ({ page }) => {
    const card = ovaCard(page, state(page).ova.title)
    await expect(card.getByRole('link', { name: 'Reintentar generación' })).toBeVisible()
  },
)

When('reintento la generación del OVA sembrado', async ({ page }) => {
  const card = ovaCard(page, state(page).ova.title)
  await card.getByRole('link', { name: 'Reintentar generación' }).click()
  await page.waitForURL(/\/workspace\//, { timeout: 30000 })
  await page.getByRole('button', { name: 'Reintentar generación' }).click()
})

Then('la card del OVA sembrado queda en estado «Listo»', async ({ page }) => {
  const { title, jobId } = state(page).ova
  await expect
    .poll(async () => (await (await page.request.get(`${apiOrigin()}/api/jobs/${jobId}`)).json()).status, {
      timeout: 90000,
      intervals: [1000],
    })
    .toBe('done')
  await page.goto('/mis-ovas')
  await searchOva(page, title)
  await expect(ovaCard(page, title).getByText('Listo', { exact: true })).toBeVisible({ timeout: 20000 })
})

// ── Metadatos y tema del paquete (FP-006) ────────────────────────────────────

When('abro los metadatos del OVA sembrado', async ({ page }) => {
  await cardMenuAction(page, ovaCard(page, state(page).ova.title), 'Editar título y descripción')
  await expect(page.getByRole('dialog', { name: 'Editar metadatos del OVA' })).toBeVisible()
})

When(
  'elijo la licencia {string} y el tema del paquete {string}',
  async ({ page }, license, theme) => {
    const dialog = page.getByRole('dialog', { name: 'Editar metadatos del OVA' })
    await dialog.getByLabel('Licencia').selectOption({ label: license })
    // El selector carga el catálogo de temas: hasta entonces está deshabilitado.
    const themeSelect = dialog.getByLabel('Tema del paquete')
    await expect(themeSelect).toBeEnabled({ timeout: 20000 })
    await themeSelect.selectOption({ label: theme })
  },
)

When('guardo los metadatos', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: 'Editar metadatos del OVA' })
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(dialog).toBeHidden({ timeout: 20000 })
})

When('recargo Mis OVAs y localizo el OVA sembrado', async ({ page }) => {
  await page.goto('/mis-ovas')
  await searchOva(page, state(page).ova.title)
})

Then(
  'los metadatos muestran la licencia {string} y el tema del paquete {string}',
  async ({ page }, license, theme) => {
    const dialog = page.getByRole('dialog', { name: 'Editar metadatos del OVA' })
    await expect(dialog.getByLabel('Licencia')).toHaveValue(license)
    const themeSelect = dialog.getByLabel('Tema del paquete')
    await expect(themeSelect).toBeEnabled({ timeout: 20000 })
    await expect(themeSelect.locator('option:checked')).toHaveText(theme)
  },
)

Then('la card del OVA sembrado resume la licencia {string}', async ({ page }, license) => {
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click()
  await expect(ovaCard(page, state(page).ova.title)).toContainText(`Licencia: ${license}`)
})
