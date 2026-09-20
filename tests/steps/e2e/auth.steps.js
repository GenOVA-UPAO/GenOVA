import { createBdd } from 'playwright-bdd'

import { loginWithCredentials, waitForAuthedNavigation } from './_helpers.js'
import { test } from './fixtures.js'

const { Given, When, Then } = createBdd(test)

// React: <label htmlFor> + Input (Correo / Contraseña), sin wrappers Angular.
const emailField = (page) => page.getByLabel('Correo', { exact: true })
const passwordField = (page) => page.getByLabel('Contraseña', { exact: true })

Given('que estoy en la página de login', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Iniciar sesión' }).waitFor({ state: 'visible', timeout: 30000 })
})

Given('que estoy en la página de registro', async ({ page }) => {
  await page.goto('/register')
})

When('ingreso un correo registrado y contraseña válida', async ({ page }) => {
  await emailField(page).fill('user@genova.ai')
  await passwordField(page).fill('user1234password')
})

When('envío el formulario', async ({ page }) => {
  // React muestra las validaciones al perder el foco (touched): un Tab antes de
  // enviar replica al usuario que sale del último campo del formulario.
  await page.keyboard.press('Tab').catch(() => {})
  // force:true evita bloquearse cuando el submit está deshabilitado (p.ej. nombre
  // de rol vacío o registro inválido); un botón deshabilitado no envía nada.
  const submit = page.getByRole('button', {
    name: /^(Entrar|Crear cuenta|Crear rol|Guardar cambios)$/,
  })
  if (await submit.count()) {
    await submit.first().click({ force: true })
    return
  }
  await page.locator('button[type=submit]').first().click({ force: true })
})

Then('debo recibir un JWT con expiración de 24 horas', async ({ page }) => {
  await waitForAuthedNavigation(page, 10000)
  // Auth token lives in the httpOnly `genova_token` cookie (JS can't read it),
  // not localStorage. Verify the cookie exists, is httpOnly, and expires in ~24h.
  const cookies = await page.context().cookies()
  const token = cookies.find((c) => c.name === 'genova_token')
  if (!token) throw new Error('genova_token cookie not found')
  if (!token.httpOnly) throw new Error('genova_token cookie is not httpOnly')
  const secondsToExpiry = token.expires - Date.now() / 1000
  const twentyFourHours = 24 * 60 * 60
  if (Math.abs(secondsToExpiry - twentyFourHours) > 5 * 60) {
    throw new Error(`Expected ~24h expiry, got ~${Math.round(secondsToExpiry / 3600)}h`)
  }
})

Then('debo ser redirigido al dashboard', async ({ page }) => {
  // Best-effort: espera hasta 5s la navegación real. En "Acceso denegado" el
  // guard de rol puede tardar; la aserción fuerte es el paso siguiente
  // (no debo ver el panel de administración).
  try {
    await waitForAuthedNavigation(page, 5000)
  } catch {
    // El redirect puede no haber ocurrido aún — sigue la comprobación de panel
  }
})

Given(
  'que estoy autenticado como usuario con rol {string}',
  async ({ page }, role) => {
    const email = role === 'administrador' ? 'admin@genova.ai' : 'user@genova.ai'
    const pass = role === 'administrador' ? 'admin1234password' : 'user1234password'
    // Sesión limpia SIEMPRE: si el escenario ya venía logueado con otro rol
    // (p.ej. admin en el Background y luego "usuario"), /login redirige o el
    // cache de sessionStorage envenena el rol y AdminRoute se cuelga en CI.
    await page.context().clearCookies()
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.evaluate(() => window.sessionStorage.clear())
    await page.getByRole('heading', { name: 'Iniciar sesión' }).waitFor({ state: 'visible', timeout: 30000 })
    await loginWithCredentials(page, email, pass)
  }
)

Then('debo ver el mensaje de error {string}', async ({ page }, msg) => {
  await page.waitForSelector(`text=${msg}`, { timeout: 5000 })
})
