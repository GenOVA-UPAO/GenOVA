// Fixtures compartidos de la suite e2e. Con E2E_API_ORIGIN definido, el
// frontend llama a esa API (p.ej. un backend local con LLM_FAKE=1 en otro
// puerto) en vez del proxy de Vite (/api -> 127.0.0.1:8000). Sin la variable,
// el test es exactamente el de playwright-bdd (mismo-origen vía proxy).
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
