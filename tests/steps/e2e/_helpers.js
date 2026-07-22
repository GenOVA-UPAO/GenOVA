// Helpers compartidos por los steps e2e. No define steps (playwright-bdd lo
// importa por el glob steps/e2e/**/*.js pero solo exporta funciones).

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
 * Siembra un OVA terminado vía API usando la sesión (cookie) del page ya logueado.
 * Requiere backend con LLM_FAKE=1 para completar en segundos sin proveedores LLM.
 * Devuelve { title, jobId, ovaId }.
 */
export async function seedOvaViaApi(page) {
  const title = `OVA e2e ${uniqueId()}`
  const res = await page.request.post('/api/jobs', {
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

  const deadline = Date.now() + 90000
  for (;;) {
    const poll = await page.request.get(`/api/jobs/${jobId}`)
    if (poll.ok()) {
      const job = await poll.json()
      if (job.status === 'done') return { title, jobId, ovaId: job.ova_id }
      if (job.status === 'error' || job.status === 'canceled') {
        throw new Error(`Seed OVA terminó en estado "${job.status}" (¿backend sin LLM_FAKE=1?)`)
      }
    }
    if (Date.now() > deadline) {
      throw new Error('Seed OVA superó los 90s sin llegar a done (¿backend sin LLM_FAKE=1?)')
    }
    await page.waitForTimeout(1000)
  }
}

/** Cards de Mis OVAs / Papelera que contienen el título dado (para conteos). */
export function ovaCards(page, title) {
  return page.locator('gn-ova-card, gn-trashed-ova-card').filter({ hasText: title })
}

/** Primera card de Mis OVAs / Papelera que contiene el título dado. */
export function ovaCard(page, title) {
  return ovaCards(page, title).first()
}

/** Busca el título en el buscador de Mis OVAs y espera a que la card aparezca. */
export async function searchOva(page, title) {
  // El <input> real (no el host <gn-search-input>, que también refleja el
  // atributo placeholder): apuntamos por rol para no chocar con strict mode.
  const search = page.getByRole('textbox', { name: /Buscar por título/i })
  await search.waitFor({ state: 'visible', timeout: 15000 })
  await search.fill(title)
  await ovaCard(page, title).waitFor({ state: 'visible', timeout: 15000 })
}
