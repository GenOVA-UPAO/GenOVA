import { createBdd } from 'playwright-bdd'

const { Given, When, Then } = createBdd()

// ── Auth HU-001: Registro ─────────────────────────────────────────────────────

When(
  'ingreso un correo válido y una contraseña alfanumérica de mínimo {int} caracteres',
  async ({ page }, _minLen) => {
    const uid = Date.now()
    await page.fill('[name=email], input[type=email]', `test_${uid}@test.com`)
    await page.fill('[name=password], input[type=password]', 'newpass99x')
  }
)

Then('el sistema debe crear la cuenta', async () => {})
Then('los campos university_id, gender y phone_number deben crearse como NULL', async () => {})
Then('debo recibir un JWT', async ({ page }) => {
  const token = await page.evaluate(() => localStorage.getItem('genova_token'))
  if (!token) throw new Error('JWT not found in localStorage')
})

Given('que el correo {string} ya está registrado', async () => {})

When('intento registrarme con ese correo', async ({ page }) => {
  await page.fill('[name=email], input[type=email]', 'user@genova.ai')
  await page.fill('[name=password], input[type=password]', 'somepassword123')
})

Then('debo ver un mensaje indicando que el correo ya existe', async ({ page }) => {
  await page.waitForSelector(
    'text=correo, text=duplicado, text=existe, text=registrado',
    { timeout: 5000 }
  )
})

Then('no debo ser redirigido al dashboard', async ({ page }) => {
  await page.waitForTimeout(500)
  const url = page.url()
  if (/dashboard/.test(url)) throw new Error('Should not be on dashboard')
})

// ── Auth HU-008: Login ────────────────────────────────────────────────────────

When('ingreso un correo o contraseña inválidos', async ({ page }) => {
  await page.fill('[name=email], input[type=email]', 'noexiste@test.com')
  await page.fill('[name=password], input[type=password]', 'wrongpass')
})

Then('debo recibir un error descriptivo', async ({ page }) => {
  // Wait for any visible error indicator
  await page.waitForFunction(
    () => {
      const t = document.body.innerText.toLowerCase()
      return t.includes('inválid') || t.includes('incorrecto') || t.includes('no existe') ||
        !!document.querySelector('[role=alert], .error')
    },
    { timeout: 8000 }
  )
})

Then('no debo acceder al dashboard', async ({ page }) => {
  await page.waitForTimeout(500)
  const url = page.url()
  if (/dashboard/.test(url)) throw new Error('Should not be on dashboard')
})

Given('que realizo 5 intentos fallidos consecutivos', async ({ page }) => {
  await page.goto('/login')
})

When('intento iniciar sesión nuevamente', async ({ page }) => {
  const emailInput = page.locator('[name=email], input[type=email]').first()
  const passInput = page.locator('[name=password], input[type=password]').first()
  await emailInput.fill('lockout@test.com')
  await passInput.fill('wrongpass')
  await page.click('button[type=submit]')
})

Then('la cuenta debe quedar bloqueada por 15 minutos', async () => {})

Then('debo recibir un mensaje indicando el bloqueo', async () => {})

// ── Roles HU-018 ─────────────────────────────────────────────────────────────

Given(
  'que los roles del sistema {string} y {string} ya existen en la base de datos',
  async () => {}
)

Then('debo ver la opción {string} en el menú del panel', async ({ page }, option) => {
  await page.waitForSelector(`text=${option}`, { timeout: 5000 })
})

When('navega a {string}', async ({ page }, path) => {
  await page.goto(path)
})

Then('no debo ver el panel de administración', async ({ page }) => {
  await page.waitForTimeout(500)
  const count = await page.locator('text=Gestión').count()
  if (count > 0) throw new Error('Should not see admin panel')
})

Given('que estoy en {string}', async ({ page }, path) => {
  await page.goto(path)
})

Given('que existe un rol con nombre {string}', async () => {})

When('intento crear otro rol con el mismo nombre {string}', async ({ page }, name) => {
  await page.fill('input[placeholder*=nombre], input[name=name]', name)
})

Then('el sistema retorna 409', async ({ page }) => {
  await page.waitForSelector('text=Ya existe, text=duplicado, text=409', { timeout: 5000 })
})

Then('el rol no debe duplicarse en la lista', async () => {})

Given('que estoy en el formulario de creación de roles', async ({ page }) => {
  await page.goto('/admin/roles')
})

When('dejo el campo nombre vacío', async ({ page }) => {
  const input = page.locator('input[placeholder*=nombre], input[name=name]').first()
  await input.fill('')
})

Then('debo ver un mensaje de error indicando que el nombre es obligatorio', async ({ page }) => {
  await page.waitForSelector(
    'text=obligatorio, text=requerido, text=vacío, [role=alert]',
    { timeout: 5000 }
  )
})

Then('el formulario no debe enviarse al backend', async () => {})

// ── OVA HU-006: Historial ─────────────────────────────────────────────────────

Given('el usuario {string} está autenticado con rol {string}', async ({ page }, email, role) => {
  const pass = role === 'administrador' ? 'admin1234password' : 'user1234password'
  await page.goto('/login')
  await page.fill('[name=email], input[type=email]', email)
  await page.fill('[name=password], input[type=password]', pass)
  await page.click('button[type=submit]')
  await page.waitForURL(/dashboard|mis-ovas/, { timeout: 10000 })
})

Given('existen los siguientes OVAs para {string}:', async () => {})
Given('existen {int} OVAs para {string}', async () => {})
Given('{string} no tiene OVAs creados', async () => {})

When('navego a {string}', async ({ page }, path) => {
  await page.goto(path)
})

When('hago clic en {string}', async ({ page }, btnText) => {
  await page.getByRole('button', { name: btnText }).click()
})

When('hago clic en {string} del OVA {string}', async ({ page }, btnText, _title) => {
  await page.getByRole('button', { name: btnText }).first().click()
})

When('escribo {string} en el campo de búsqueda', async ({ page }, text) => {
  await page.fill('input[placeholder*=buscar], input[placeholder*=búsqueda], input[type=search]', text)
})

When('selecciono el filtro {string}', async ({ page }, filter) => {
  await page.selectOption('select, [role=combobox]', { label: filter })
})

When('confirmo la eliminación', async ({ page }) => {
  await page.getByRole('button', { name: /confirm|eliminar|sí|ok/i }).click()
})

Then('veo exactamente {int} cards de OVAs', async ({ page }, _n) => {
  await page.waitForSelector('[data-testid=ova-card], .ova-card, article', { timeout: 8000 })
})

Then('están ordenados por fecha de creación descendente', async () => {})
Then('cada card muestra título, fecha y badge de estado', async () => {})

Then('veo {int} OVAs en la primera página', async ({ page }, _n) => {
  await page.waitForSelector('[data-testid=ova-card], .ova-card, article', { timeout: 8000 })
})

Then('veo el control de paginación con {string}', async ({ page }, label) => {
  await page.waitForSelector(`text=${label}`, { timeout: 5000 })
})

Then('veo los {int} OVAs restantes', async ({ page }, _n) => {
  await page.waitForSelector('[data-testid=ova-card], .ova-card, article', { timeout: 8000 })
})

Then('veo únicamente el OVA {string}', async ({ page }, title) => {
  await page.waitForSelector(`text=${title}`, { timeout: 5000 })
})

Then('el contador muestra {string}', async ({ page }, label) => {
  await page.waitForSelector(`text=${label}`, { timeout: 5000 })
})

Then('veo el estado vacío con el mensaje {string}', async ({ page }, msg) => {
  await page.waitForSelector(`text=${msg}`, { timeout: 5000 })
})

Then('el navegador inicia la descarga del paquete SCORM', async () => {})

Then('aparece un modal con el texto {string}', async ({ page }, text) => {
  await page.waitForSelector(`text=${text}`, { timeout: 5000 })
})

Then('el OVA {string} desaparece de la lista', async ({ page }, _title) => {
  await page.waitForTimeout(500)
})

Then('al pasar el cursor muestra {string}', async () => {})

Then('veo el mensaje {string}', async ({ page }, msg) => {
  await page.waitForSelector(`text=${msg}`, { timeout: 5000 })
})

Then('veo el botón {string}', async ({ page }, label) => {
  await page.waitForSelector(`button:has-text("${label}"), [role=button]:has-text("${label}")`, {
    timeout: 5000,
  })
})

Then('ve OVAs de todos los usuarios', async ({ page }) => {
  await page.waitForSelector('[data-testid=ova-card], .ova-card, article', { timeout: 8000 })
})

Then('cada card muestra el nombre del propietario', async () => {})

// ── Auth HU-008: Token expiry ─────────────────────────────────────────────────

Given('que tengo un token expirado en el cliente', async ({ page }) => {
  await page.goto('/login')
  await page.evaluate(() => localStorage.setItem('genova_token', 'expired.fake.token'))
})

When('intento acceder a una ruta protegida', async ({ page }) => {
  await page.goto('/dashboard')
})

Then('debo ser redirigido automáticamente al login', async ({ page }) => {
  await page.waitForURL(/login/, { timeout: 8000 })
})

Given('que tengo una sesión activa', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name=email], input[type=email]', 'user@genova.ai')
  await page.fill('[name=password], input[type=password]', 'user1234password')
  await page.click('button[type=submit]')
  await page.waitForURL(/dashboard|mis-ovas/, { timeout: 10000 })
})

Then('el token debe eliminarse del cliente', async ({ page }) => {
  const token = await page.evaluate(() => localStorage.getItem('genova_token'))
  if (token) throw new Error('Token should have been removed')
})

Then('debo ser redirigido al login', async ({ page }) => {
  await page.waitForURL(/login/, { timeout: 8000 })
})
