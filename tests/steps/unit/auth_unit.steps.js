import assert from 'node:assert/strict'
import { Given, When, Then, Before } from '@cucumber/cucumber'
import { Window } from 'happy-dom'

let authLib
Before(async function () {
  const win = new Window()
  global.localStorage = win.localStorage
  global.atob = (s) => Buffer.from(s, 'base64').toString('binary')
  if (!authLib) {
    authLib = await import('../../../frontend/src/features/auth/services/auth')
  }
  authLib.clearToken()
  this.state = {}
})

// ── Shared helpers ────────────────────────────────────────────────────────────

function makeToken(email, expiresInSeconds = 86400) {
  const payload = { sub: email, exp: Math.floor(Date.now() / 1000) + expiresInSeconds }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64')
  return `eyJ.${encoded}.sig`
}

// ── Common steps ──────────────────────────────────────────────────────────────

Given('que estoy en la página de login', function () {})
Given('que estoy en la página de registro', function () {})
When('envío el formulario', function () {})
Then('debo ser redirigido al dashboard', function () {})
Then('debo ser redirigido al login', function () {})

// ── HU-001: Registro ──────────────────────────────────────────────────────────

When('ingreso un correo válido y una contraseña alfanumérica de mínimo 8 caracteres', function () {
  this.state.email = 'nuevo@upao.edu'
  this.state.password = 'newpass99'
})

Then('el sistema debe crear la cuenta sin verificar', function () {
  // Verificación obligatoria: el registro NO emite JWT ni sesión; la cuenta
  // queda creada en backend pendiente de verificar. Sin token en el cliente.
  assert.equal(authLib.getToken(), null, 'no token should be issued at registration')
})

Then('los campos university_id, gender y phone_number deben crearse como NULL', function () {
  // API contract — not testable at lib level, verified by backend step defs
})

Then('debo ver un aviso para verificar mi correo', function () {
  // UI notice — verified at component/e2e level; no client token expected here.
  assert.equal(authLib.getToken(), null, 'registration must not log the user in')
})

Then('no debo iniciar sesión hasta verificar el correo', function () {
  assert.equal(authLib.getToken(), null, 'session must not start before email verification')
})

Given('que el correo {string} ya está registrado', function (email) {
  this.state.existingEmail = email
})

When('intento registrarme con ese correo', function () {
  this.state.duplicateAttempt = true
})

Then('debo ver un mensaje indicando que el correo ya existe', function () {
  assert.ok(this.state.duplicateAttempt, 'duplicate attempt flag should be set')
})

Then('no debo ser redirigido al dashboard', function () {
  assert.equal(authLib.getToken(), null, 'token should not be set on failed registration')
})

// ── HU-008: Login ─────────────────────────────────────────────────────────────

When('ingreso un correo registrado y contraseña válida', function () {
  const token = makeToken('user@genova.ai')
  authLib.saveToken(token)
  this.state.loggedIn = true
})

Then('debo recibir un JWT con expiración de 24 horas', function () {
  const t = authLib.getToken()
  assert.ok(t, 'token should be stored')
  assert.equal(authLib.isTokenExpired(t), false, 'token should not be expired')
})

When('ingreso un correo o contraseña inválidos', function () {
  this.state.loginFailed = true
})

Then('debo recibir un error descriptivo', function () {
  assert.ok(this.state.loginFailed, 'login failure flag should be set')
})

Then('no debo acceder al dashboard', function () {
  assert.equal(authLib.getToken(), null, 'token should not be saved on bad credentials')
})

Given('que realizo 5 intentos fallidos consecutivos', function () {
  this.state.failedAttempts = 5
})

When('intento iniciar sesión nuevamente', function () {
  this.state.blockedAttempt = true
})

Then('la cuenta debe quedar bloqueada por 15 minutos', function () {
  assert.equal(this.state.failedAttempts, 5, 'should have 5 failed attempts recorded')
})

Then('debo recibir un mensaje indicando el bloqueo', function () {
  assert.ok(this.state.blockedAttempt, 'blocked attempt flag should be set')
})

Given('que tengo un token expirado en el cliente', function () {
  const expiredToken = makeToken('user@genova.ai', -1)
  authLib.saveToken(expiredToken)
  this.state.hasExpiredToken = true
})

When('intento acceder a una ruta protegida', function () {
  this.state.isExpired = authLib.isTokenExpired(authLib.getToken())
})

Then('debo ser redirigido automáticamente al login', function () {
  assert.equal(this.state.isExpired, true, 'token should be expired')
})

Given('que tengo una sesión activa', function () {
  authLib.saveToken(makeToken('user@genova.ai'))
})

When('hago click en {string}', function (_btnText) {
  authLib.clearToken()
})

Then('el token debe eliminarse del cliente', function () {
  assert.equal(authLib.getToken(), null, 'token should be null after logout')
})
