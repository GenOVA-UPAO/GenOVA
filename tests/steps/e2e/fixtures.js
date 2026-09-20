// Fixtures compartidos de la suite e2e. TODAS las step files deben usar
// `createBdd(test)` de este módulo: si alguna llama `createBdd()` a secas,
// Playwright no inyecta E2E_API_ORIGIN y el login cae en el proxy de Vite
// (:8000, LLM de pago / apagado).
//
// Con E2E_API_ORIGIN el navegador llama a esa API (p.ej. LLM_FAKE=1 en :8100)
// en vez del proxy. Eso es cross-origin (:4300 → :8100): el backend tiene que
// listar el origen del frontend en CORS (dev defaults cubren :4200, no :4300).
import { test as base } from 'playwright-bdd'

const apiOrigin = (process.env.E2E_API_ORIGIN ?? '').trim()

export const test = apiOrigin
  ? base.extend({
      context: async ({ context }, use) => {
        await context.addInitScript((origin) => {
          window.__GENOVA_API_BASE__ = origin
        }, apiOrigin)
        await use(context)
      },
    })
  : base
