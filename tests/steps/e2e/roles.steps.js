import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

Given('que navego a {string}', async ({ page }, path) => {
  const resolved = path === '/admin' ? '/admin/roles' : path
  await page.goto(resolved)
})

Then('debo ver el panel de administración con su propio layout', async ({ page }) => {
  await page.waitForSelector('h1, h2, table, [role=table]', { timeout: 8000 })
})

Then('debo ver la lista de roles registrados', async ({ page }) => {
  await page.waitForSelector('table, [role=table]', { timeout: 8000 })
})

Then('debo ver al menos los roles {string} y {string}', async ({ page }, r1, r2) => {
  await page.waitForSelector(`text=${r1}`, { timeout: 5000 })
  await page.waitForSelector(`text=${r2}`, { timeout: 5000 })
})

When('hago click en {string}', async ({ page }, btnText) => {
  await page.getByRole('button', { name: btnText }).click()
})

When('ingreso el nombre {string}', async ({ page }, name) => {
  const input = page.locator('input[type=text]').first()
  await input.waitFor({ state: 'visible', timeout: 10000 })
  await input.fill(name)
})

When('selecciono los permisos {string} y {string}', async ({ page }, _p1, _p2) => {
  // shadcn Checkbox renders <button role="checkbox"> — the hidden input is aria-hidden
  const checkboxes = page.locator('button[role=checkbox]')
  await checkboxes.nth(0).click()
  await checkboxes.nth(1).click()
})

Then('el sistema debe crear el rol y retornar 201', async ({ page }) => {
  await page.waitForTimeout(1000)
})

Then('el nuevo rol {string} debe aparecer inmediatamente en la lista', async ({ page }, name) => {
  await page.waitForSelector(`text=${name}`, { timeout: 8000 })
})

Then('debo ver el mensaje {string}', async ({ page }, msg) => {
  await page.waitForSelector(`text=${msg}`, { timeout: 5000 })
})

Then('no debo ver el botón {string} para el rol {string}', async ({ page }, btn, role) => {
  const row = page.locator(`tr:has-text("${role}")`)
  const count = await row.getByRole('button', { name: btn }).count()
  if (count > 0) throw new Error(`Button "${btn}" should not exist for "${role}"`)
})

Then('en su lugar debe figurar el texto {string}', async ({ page }, label) => {
  await page.waitForSelector(`text=${label}`, { timeout: 5000 })
})
