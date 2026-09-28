// Helpers compartidos por la auditoría axe-core (tema, navegación y logging de
// violaciones). Las sesiones se preparan en global-setup.js vía storageState.
import AxeBuilder from '@axe-core/playwright'

export const ADMIN = { email: 'admin@genova.ai', pass: 'admin1234password' }
export const USER = { email: 'user@genova.ai', pass: 'user1234password' }

/** Modos de la matriz de cobertura: escritorio, oscuro y móvil. */
export const MODES = [
  { name: 'escritorio', dark: false, mobile: false },
  { name: 'escritorio oscuro', dark: true, mobile: false },
  { name: 'móvil', dark: false, mobile: true },
]

export async function analyze(page) {
  // Varias pantallas usan animaciones de entrada (animate-in fade-in, hasta
  // ~800ms con delay) que dejan el texto a mitad de opacidad justo cuando el
  // heading ya existe en el DOM. Sin esta espera, axe-core mide un frame
  // intermedio y reporta contraste de color falso-positivo.
  await page.waitForTimeout(900)
  return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
}

export function logViolations(results) {
  console.log(`axe: ${results.violations.length} violaciones, ${results.passes.length} reglas sin hallazgos`)
  for (const v of results.violations) {
    const mark = ['serious', 'critical'].includes(v.impact) ? '✖' : '·'
    console.log(`${mark} [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodos)`)
    for (const node of v.nodes) {
      const selector = node.target.join(' ')
      console.log(`    → ${selector}${node.failureSummary ? ` — ${node.failureSummary.split('\n').pop()}` : ''}`)
    }
  }
}

export function seriousViolations(results) {
  logViolations(results)
  // A11Y_STRICT=1 convierte cualquier violación (también moderate/minor) en fallo,
  // para inventariar deuda de accesibilidad sin cambiar el gate por defecto.
  if (process.env.A11Y_STRICT === '1') return results.violations
  return results.violations.filter((v) => ['serious', 'critical'].includes(v.impact))
}

export async function applyMode(page, mode) {
  if (mode.dark) {
    // La clave de localStorage se lee en el script inline de index.html (pre-paint).
    await page.addInitScript(() => {
      localStorage.setItem('genova.theme', 'dark')
    })
  }
}

/** Navega a una ruta autenticada y espera a que exista un h1 estable. */
export async function gotoApp(page, path, heading) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  const h1 = page.locator('h1').first()
  await h1.waitFor({ timeout: 15000 })
  if (heading) {
    await page.getByRole('heading', { level: 1, name: heading }).waitFor({ timeout: 15000 })
  }
  return h1
}

/** Espera al diálogo abierto y devuelve su locator. */
export async function openDialog(page) {
  const dialog = page.getByRole('dialog').first()
  await dialog.waitFor({ timeout: 10000 })
  return dialog
}

export async function closeDialog(page, name = 'Cancelar') {
  await page.getByRole('dialog').getByRole('button', { name }).first().click()
  await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 10000 })
}
