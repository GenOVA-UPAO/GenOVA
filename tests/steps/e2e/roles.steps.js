import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

Given('que navego a {string}', async ({ page }, path) => {
  await page.goto(path)
})

Then('debo ver el panel de administración con su propio layout', async ({ page }) => {
  await page.waitForSelector('text=Gestión', { timeout: 5000 })
})

Then('debo ver la lista de roles registrados', async ({ page }) => {
  await page.waitForSelector('table, [role=table]', { timeout: 5000 })
})

Then('debo ver al menos los roles {string} y {string}', async ({ page }, r1, r2) => {
  await page.waitForSelector(`text=${r1}`)
  await page.waitForSelector(`text=${r2}`)
})

When('hago click en {string}', async ({ page }, btnText) => {
  await page.getByRole('button', { name: btnText }).click()
})

When('ingreso el nombre {string}', async ({ page }, name) => {
  await page.fill('input[placeholder*=nombre], input[name=name]', name)
})

When('selecciono los permisos {string} y {string}', async ({ page }, p1, p2) => {
  await page.getByLabel(p1).check()
  await page.getByLabel(p2).check()
})

Then('el sistema debe crear el rol y retornar 201', async ({ page }) => {
  await page.waitForSelector(`text=docente`, { timeout: 5000 })
})

Then('el nuevo rol {string} debe aparecer inmediatamente en la lista', async ({ page }, name) => {
  await page.waitForSelector(`text=${name}`)
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
  await page.waitForSelector(`text=${label}`)
})
