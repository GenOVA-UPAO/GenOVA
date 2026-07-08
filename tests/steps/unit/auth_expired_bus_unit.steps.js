import assert from 'node:assert/strict'
import { Given, When, Then } from '@cucumber/cucumber'

// BU-001 unit coverage — AuthExpiredBus es el mecanismo reactivo real de
// expiración de sesión (http.ts dispara notify() en 401; AuthService redirige).
// Se importa el módulo puro (sin Angular) para correr en Node.
import { AuthExpiredBus } from '../../../frontend/src/core/lib/auth-expired-bus'

async function bus() {
  return AuthExpiredBus
}

Given('un suscriptor registrado en el bus de expiración', async function () {
  const b = await bus()
  this.calls = [0]
  this.unsubs = [b.subscribe(() => (this.calls[0] += 1))]
})

Given('el suscriptor cancela su suscripción', function () {
  for (const unsub of this.unsubs) unsub()
})

Given('{int} suscriptores registrados en el bus de expiración', async function (n) {
  const b = await bus()
  this.calls = Array.from({ length: n }, () => 0)
  this.unsubs = this.calls.map((_, i) => b.subscribe(() => (this.calls[i] += 1)))
})

When('el bus notifica la expiración de sesión', async function () {
  const b = await bus()
  b.notify()
  // Limpieza: no dejar suscriptores colgados para otros escenarios.
  for (const unsub of this.unsubs) unsub()
})

Then('el suscriptor fue notificado {int} vez', function (n) {
  assert.equal(this.calls[0], n)
})

Then('el suscriptor fue notificado {int} veces', function (n) {
  assert.equal(this.calls[0], n)
})

Then('cada suscriptor fue notificado {int} vez', function (n) {
  for (const c of this.calls) assert.equal(c, n)
})
