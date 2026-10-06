// Inicializa i18n en español para los escenarios unitarios, como `frontend/src/test-setup.ts`
// en vitest. `core/i18n/config.ts` usa `import.meta.glob` (solo Vite), así que aquí los JSON
// se leen con fs. Según cómo tsx cargue cada módulo del frontend (ESM o CommonJS), este usa
// la build ESM o la CJS de i18next, que son instancias distintas: se inicializan las dos.
import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BeforeAll } from '@cucumber/cucumber'
import * as i18nextEsm from '../../../frontend/node_modules/i18next/dist/esm/i18next.js'

const here = dirname(fileURLToPath(import.meta.url))
const frontend = join(here, '../../../frontend')
const locales = join(frontend, 'src/core/i18n/locales')

function instance(mod) {
  // El default puede llegar directo o envuelto según el cargador.
  if (typeof mod?.init === 'function') return mod
  return instance(mod?.default)
}

function resources() {
  const all = {}
  for (const language of readdirSync(locales)) {
    all[language] = {}
    for (const file of readdirSync(join(locales, language)).filter((f) => f.endsWith('.json'))) {
      all[language][file.replace(/\.json$/, '')] = JSON.parse(readFileSync(join(locales, language, file), 'utf8'))
    }
  }
  return all
}

const instances = new Set([
  instance(i18nextEsm),
  instance(createRequire(join(frontend, 'package.json'))('i18next')),
])

BeforeAll(async () => {
  const shared = resources()
  for (const i18n of instances) {
    if (!i18n.isInitialized) {
      await i18n.init({
        resources: shared,
        lng: 'es',
        fallbackLng: 'es',
        defaultNS: 'common',
        interpolation: { escapeValue: false },
        returnNull: false,
      })
    }
    await i18n.changeLanguage('es')
  }
})
