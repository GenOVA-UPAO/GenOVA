// Helpers compartidos por los steps e2e. No define steps (playwright-bdd lo
// importa por el glob steps/e2e/**/*.js pero solo exporta funciones).

import { expect } from '@playwright/test'

/** Sufijo único por ejecución+escenario para no colisionar datos en la DB de test. */
export function uniqueId() {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`
}

/** Estado por escenario colgado del page (cada escenario recibe un page fresco). */
export function state(page) {
  if (!page.__e2e) page.__e2e = {}
  return page.__e2e
}

/**
 * Origen de la API para las llamadas directas (page.request). Vacío = relativo,
 * es decir same-origin a través del proxy de Vite. Ver fixtures.js: con
 * E2E_API_ORIGIN, el navegador también apunta ahí.
 */
export function apiOrigin() {
  return (process.env.E2E_API_ORIGIN ?? '').trim()
}

/**
 * Siembra un OVA terminado vía API usando la sesión (cookie) del page ya logueado.
 * Requiere backend con LLM_FAKE=1 para completar en segundos sin proveedores LLM.
 * Devuelve { title, jobId, ovaId }.
 */
export async function seedOvaViaApi(page) {
  const title = `OVA e2e ${uniqueId()}`
  const res = await page.request.post(`${apiOrigin()}/api/jobs`, {
    data: {
      prompt: title,
      resources: [
        { phase_type: 'engage', resource_type: 'Cómic Interactivo' },
        { phase_type: 'explore', resource_type: 'Lectura Interactiva' },
      ],
    },
  })
  if (res.status() !== 202) {
    throw new Error(`Seed OVA falló: POST /api/jobs → ${res.status()} ${await res.text()}`)
  }
  const { job_id: jobId } = await res.json()

  let seeded
  await expect
    .poll(
      async () => {
        const poll = await page.request.get(`${apiOrigin()}/api/jobs/${jobId}`)
        if (!poll.ok()) return false
        const job = await poll.json()
        if (job.status === 'error' || job.status === 'canceled') {
          throw new Error(`Seed OVA terminó en estado "${job.status}" (¿backend sin LLM_FAKE=1?)`)
        }
        if (job.status !== 'done') return false
        seeded = { title, jobId, ovaId: job.ova_id }
        return true
      },
      { timeout: 90000, intervals: [1000] },
    )
    .toBe(true)
  return seeded
}

/**
 * True si el pathname está dentro del área autenticada. Ojo: no usar
 * `waitForURL(/dashboard/)` contra la URL completa — React añade
 * `?returnUrl=%2Fdashboard` en /login y el regex haría match antes del login.
 */
export function isAuthedPath(pathname) {
  return /^\/(dashboard|mis-ovas|admin)(\/|$)/.test(pathname)
}

/** Espera a que la navegación real (pathname) llegue al área autenticada. */
export function waitForAuthedNavigation(page, timeout = 20000) {
  return page.waitForURL((url) => isAuthedPath(url.pathname), { timeout })
}

/**
 * Abre /login y espera el formulario. Se exige el formulario a la primera: si
 * el loader de `requireGuest` volviera a tirar ante un 5xx/CORS, la pantalla
 * caería en RouteError y este paso debe fallar, no recuperarse en silencio.
 */
export async function openLoginPage(page, timeout = 30000) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Iniciar sesión' }).waitFor({ state: 'visible', timeout })
}

/**
 * Login por UI con reintento ante el throttle por email del backend
 * (5 intentos/minuto con RATE_LIMIT_ENABLED=1, el default local). El reintento
 * espera la ventana y vuelve a enviar, como haría la persona usuaria.
 */
export async function loginWithCredentials(page, email, password, timeout = 20000) {
  await page.getByLabel('Correo', { exact: true }).fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  try {
    await waitForAuthedNavigation(page, timeout)
  } catch (error) {
    const throttled = await page
      .getByText(/Demasiados intentos/)
      .isVisible()
      .catch(() => false)
    if (!throttled) throw error
    await expect
      .poll(
        async () => {
          await page.getByRole('button', { name: 'Entrar' }).click()
          return isAuthedPath(new URL(page.url()).pathname)
        },
        { timeout: 90000, intervals: [5000] },
      )
      .toBe(true)
    await waitForAuthedNavigation(page, timeout)
  }
}

/**
 * Cards de Mis OVAs / filas de la Papelera que contienen el título dado (para
 * conteos). Se ancla en el h3 accesible con el título y se sube al contenedor
 * marcado con `data-testid="ova-card"` (tarjeta en Mis OVAs, fila en Papelera).
 */
export function ovaCards(page, title) {
  return page
    .getByRole('heading', { name: title, exact: true })
    .locator('xpath=ancestor::*[@data-testid="ova-card"][1]')
}

/** Abre el menú «Más acciones» de una card y pulsa la opción indicada. */
export async function cardMenuAction(page, card, action) {
  await card.getByRole('button', { name: /^Más acciones/ }).click()
  await page.getByRole('menuitem', { name: action }).click()
}

/** Primera card de Mis OVAs / Papelera que contiene el título dado. */
export function ovaCard(page, title) {
  return ovaCards(page, title).first()
}

/** Busca el título en el buscador de Mis OVAs y espera a que la card aparezca. */
export async function searchOva(page, title) {
  // SearchInput de React: <input type="search"> con aria-label.
  const search = page.getByRole('searchbox', { name: /Buscar por título/i })
  await search.waitFor({ state: 'visible', timeout: 15000 })
  await search.fill(title)
  await ovaCard(page, title).waitFor({ state: 'visible', timeout: 15000 })
}
