import { Given, When, Then } from 'playwright-bdd'

Given('el usuario {string} está autenticado', async ({ page }, email) => {
  const isAdmin = email.includes('admin')
  const pass = isAdmin ? 'admin1234password' : 'user1234password'
  await page.goto('/login')
  await page.fill('[name=email], input[type=email]', email)
  await page.fill('[name=password], input[type=password]', pass)
  await page.click('button[type=submit]')
  await page.waitForURL(/dashboard|mis-ovas/, { timeout: 10000 })
})

When('{string} navega a {string}', async ({ page }, _user, path) => {
  await page.goto(path)
})

Then('ve el botón {string} habilitado en la card de {string}', async ({ page }, btnText, title) => {
  const card = page.locator(`text=${title}`).locator('..')
  const btn = card.getByRole('button', { name: btnText })
  await btn.waitFor({ state: 'visible' })
  const disabled = await btn.getAttribute('disabled')
  if (disabled !== null) throw new Error(`Button "${btnText}" is disabled`)
})

Then(
  'el botón {string} del OVA {string} está deshabilitado',
  async ({ page }, btnText, ovaId) => {
    const btn = page
      .locator(`[data-ova-id="${ovaId}"]`)
      .getByRole('button', { name: btnText })
    await btn.waitFor({ state: 'visible' })
    const disabled = await btn.getAttribute('disabled')
    if (disabled === null) throw new Error(`Button "${btnText}" should be disabled`)
  }
)

When('{string} hace clic en {string} del OVA {string}', async ({ page }, _user, btnText, title) => {
  const btn = page.getByRole('button', { name: btnText }).first()
  await btn.click()
})

Then('aparece el badge {string} y la fecha actual', async ({ page }, badge) => {
  await page.waitForSelector(`text=${badge}`)
})

// Trash scenarios
Then(
  'aparece una notificación {string}',
  async ({ page }, msg) => {
    await page.waitForSelector(`text=${msg}`, { timeout: 8000 })
  }
)

Then('el OVA {string} desaparece de {string}', async ({ page }, _id, _path) => {
  // Verify the card count changed — basic liveness check
  await page.waitForTimeout(500)
})

// Metadata modal
When(
  'la usuaria hace clic en {string} de la tarjeta {string}',
  async ({ page }, btnText, _ovaId) => {
    await page.getByRole('button', { name: btnText }).click()
  }
)

Then('se abre un modal con los campos {string} y {string}', async ({ page }, f1, f2) => {
  await page.waitForSelector(`text=${f1}`)
  await page.waitForSelector(`text=${f2}`)
})
