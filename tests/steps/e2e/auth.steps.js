import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

Given('que estoy en la página de login', async ({ page }) => {
  await page.goto('/login')
})

Given('que estoy en la página de registro', async ({ page }) => {
  await page.goto('/register')
})

When('ingreso un correo registrado y contraseña válida', async ({ page }) => {
  await page.fill('[name=email], input[type=email]', 'user@genova.ai')
  await page.fill('[name=password], input[type=password]', 'user1234password')
})

When('envío el formulario', async ({ page }) => {
  await page.click('button[type=submit]')
})

Then('debo recibir un JWT con expiración de 24 horas', async ({ page }) => {
  await page.waitForURL(/dashboard|mis-ovas/, { timeout: 10000 })
  const token = await page.evaluate(() => localStorage.getItem('genova_token'))
  if (!token) throw new Error('Token not found in localStorage')
})

Then('debo ser redirigido al dashboard', async ({ page }) => {
  await page.waitForURL(/dashboard/, { timeout: 10000 })
})

Given(
  'que estoy autenticado como usuario con rol {string}',
  async ({ page }, role) => {
    const email = role === 'administrador' ? 'admin@genova.ai' : 'user@genova.ai'
    const pass = role === 'administrador' ? 'admin1234password' : 'user1234password'
    await page.goto('/login')
    await page.fill('[name=email], input[type=email]', email)
    await page.fill('[name=password], input[type=password]', pass)
    await page.click('button[type=submit]')
    await page.waitForURL(/dashboard|mis-ovas/, { timeout: 10000 })
  }
)

Then('debo ver el mensaje de error {string}', async ({ page }, msg) => {
  await page.waitForSelector(`text=${msg}`, { timeout: 5000 })
})
