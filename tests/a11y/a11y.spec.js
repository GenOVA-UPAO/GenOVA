// Auditoría de accesibilidad con axe-core sobre las pantallas principales.
// Gate: solo fallan las violaciones serious/critical (moderate/minor se
// reportan en el log para ir corrigiéndolas sin romper CI).
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

async function analyze(page) {
  // Varias pantallas usan animaciones de entrada (animate-in fade-in, hasta
  // ~800ms con delay) que dejan el texto a mitad de opacidad justo cuando el
  // heading ya existe en el DOM. Sin esta espera, axe-core mide un frame
  // intermedio y reporta contraste de color falso-positivo.
  await page.waitForTimeout(900)
  return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
}

function seriousViolations(results) {
  const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact))
  for (const v of results.violations) {
    const mark = ['serious', 'critical'].includes(v.impact) ? '✖' : '·'
    console.log(`${mark} [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodos)`)
  }
  return serious
}

async function login(page, email, pass) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByLabel('Correo', { exact: true }).fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(pass)
  await page.getByRole('button', { name: 'Entrar' }).click()
  // Predicado sobre pathname: /login?returnUrl=%2Fdashboard haría match con un regex.
  await page.waitForURL((url) => /^\/(dashboard|mis-ovas|admin)(\/|$)/.test(url.pathname), {
    timeout: 20000,
  })
}

test.describe('Accesibilidad (axe-core, WCAG 2.0 A/AA)', () => {
  test('login no tiene violaciones serias', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Iniciar sesión' }).waitFor({ timeout: 15000 })
    expect(seriousViolations(await analyze(page))).toEqual([])
  })

  test('registro no tiene violaciones serias', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Nombre completo').waitFor({ timeout: 15000 })
    expect(seriousViolations(await analyze(page))).toEqual([])
  })

  test('dashboard no tiene violaciones serias', async ({ page }) => {
    await login(page, 'user@genova.ai', 'user1234password')
    await page.goto('/dashboard')
    await page.getByRole('link', { name: 'Mis OVAs' }).first().waitFor({ timeout: 15000 })
    expect(seriousViolations(await analyze(page))).toEqual([])
  })

  test('mis OVAs no tiene violaciones serias', async ({ page }) => {
    await login(page, 'user@genova.ai', 'user1234password')
    await page.goto('/mis-ovas')
    await page.getByRole('heading', { name: 'Biblioteca de OVAs' }).waitFor({ timeout: 15000 })
    expect(seriousViolations(await analyze(page))).toEqual([])
  })
})
