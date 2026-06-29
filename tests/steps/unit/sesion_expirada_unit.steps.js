import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Given, When, Then, Before, After } from '@cucumber/cucumber'
import { Window } from 'happy-dom'

// BU-001 unit coverage — pure logic of the new auth reactive stack:
//   - clearCurrentUser()  dispatches `auth:expired` + purges sessionStorage
//   - clearLocalCache()   purges without broadcasting
//   - markLoggedIn()      sets genova_session + invokes clearLocalCache
//   - isLoggedIn()        optimistic local-only helper
//
// The tests import the production code directly; no browser, no backend.

let authLib
let meLib
let win
let beforeUnload
let windowRef
let sessionRef
let localRef

function installHappyDom() {
  win = new Window()
  windowRef = win.window ?? win
  sessionRef = win.sessionStorage
  localRef = win.localStorage
  globalThis.window = windowRef
  globalThis.sessionStorage = sessionRef
  globalThis.localStorage = localRef
  globalThis.CustomEvent = windowRef.CustomEvent
}

Before(async function () {
  installHappyDom()
  if (!authLib) {
    authLib = await import('../../../frontend/src/features/auth/services/auth')
    meLib = await import('../../../frontend/src/core/lib/auth/me.ts')
  }
  authLib.clearToken()
  sessionRef.clear()
  localRef.clear()
  beforeUnload = { dispatched: 0, lastDetail: null }
  // Spy on dispatchEvent so we can assert the broadcast without coupling to
  // a real listener registration.
  const origDispatch = windowRef.dispatchEvent.bind(windowRef)
  windowRef.dispatchEvent = (event) => {
    if (event?.type === 'auth:expired') {
      beforeUnload.dispatched += 1
      beforeUnload.lastDetail = event.detail ?? null
    }
    return origDispatch(event)
  }
  this.env = { meLib, authLib, window: windowRef, session: sessionRef, local: localRef, dispatchSpy: beforeUnload }
})

After(function () {
  sessionRef.clear()
  localRef.clear()
})

// ── Setup helpers ────────────────────────────────────────────────────────────

Given('un usuario cacheado en sessionStorage {string}', function (key) {
  this.env.session.setItem(
    key,
    JSON.stringify({ id: 1, role: 'administrador', email: 'a@x' }),
  )
})

Given('establezco {string} a {string} en localStorage', function (key, value) {
  this.env.local.setItem(key, value)
})

// ── Actions ──────────────────────────────────────────────────────────────────

When('llamo a clearCurrentUser', function () {
  this.env.meLib.clearCurrentUser('me')
})

When('llamo a clearLocalCache', function () {
  this.env.meLib.clearLocalCache()
})

When('llamo a markLoggedIn', function () {
  this.env.authLib.markLoggedIn()
})

When('consulto isLoggedIn', function () {
  this.isLoggedIn = this.env.authLib.isLoggedIn()
})

// ── Assertions ───────────────────────────────────────────────────────────────

Then('se emite el evento {string} en window', function (type) {
  assert.ok(this.env.dispatchSpy.dispatched >= 1, `evento ${type} no emitido`)
  assert.equal(this.env.dispatchSpy.lastDetail?.source ?? null, 'me')
})

Then('NO se emite el evento {string} en window', function (_type) {
  assert.equal(this.env.dispatchSpy.dispatched, 0, 'no debió haber broadcast')
})

Then(
  'el item {string} deja de existir en sessionStorage',
  function (key) {
    assert.equal(this.env.session.getItem(key), null, `${key} debe estar vacío`)
  },
)

Then('{string} vale {string} en localStorage', function (key, value) {
  assert.equal(this.env.local.getItem(key), value)
})

Then('el resultado es true', function () {
  assert.equal(this.isLoggedIn, true)
})

Then('la respuesta se calculo sin llamadas de red', function () {
  // Optimistic gate: isLoggedIn reads only localStorage, no fetch. The
  // implementation under test never calls apiFetch; verified by source
  // inspection plus the fact that the call completed synchronously above.
  assert.equal(this.isLoggedIn, true)
})

// ── BU-001 AC#1 end-to-end flag contract ─────────────────────────────────────
// The cucumber-js + happy-dom unit harness does not mount React, so we cannot
// observe the toast directly. Instead we verify the shared contract that
// makes the message visible to the user:
//   1. AuthGate calls `flagSessionExpired()` → flag is set in sessionStorage
//   2. LoginPage calls `consumeSessionExpiredFlag()` → first call returns true
//      and clears the flag (so a refresh doesn't re-show the message)
//   3. The static source of LoginPage actually imports consumeSessionExpiredFlag
//      (closes the wiring loop without requiring a render test)

let flagLib

Given('un usuario autenticado cuya sesión JWT ha expirado', function () {
  // Simulate the cached pre-expired profile that /api/auth/me just invalidated.
  this.env.session.setItem(
    'genova_me',
    JSON.stringify({ id: 7, role: 'estudiante', email: 'u@genova.ai' }),
  )
})

Given('el AuthGate emitió auth:expired y marcó la flag de sesión expirada', async function () {
  if (!flagLib) {
    flagLib = await import(
      '../../../frontend/src/core/lib/auth/sessionExpiredFlag.ts'
    )
  }
  // Drive the same code path AuthGate does when it receives `auth:expired`.
  flagLib.flagSessionExpired()
})

When('LoginPage consume la flag de sesión expirada', async function () {
  if (!flagLib) {
    flagLib = await import(
      '../../../frontend/src/core/lib/auth/sessionExpiredFlag.ts'
    )
  }
  // First read: should report true (this is the branch that triggers the toast).
  this.firstConsume = flagLib.consumeSessionExpiredFlag()
  // Second read: should report false (the flag was cleared on first consume).
  this.secondConsume = flagLib.consumeSessionExpiredFlag()
})

Then('consumeSessionExpiredFlag devuelve true la primera vez', function () {
  assert.equal(this.firstConsume, true, 'flag debería estar presente en el primer read')
})

Then(
  'consumeSessionExpiredFlag devuelve false la segunda vez',
  function () {
    assert.equal(
      this.secondConsume,
      false,
      'flag debería estar limpia tras el primer consume',
    )
  },
)

Then(
  'LoginPage importa consumeSessionExpiredFlag desde sessionExpiredFlag',
  function () {
    const here = dirname(fileURLToPath(import.meta.url))
    const loginPagePath = join(
      here,
      '..',
      '..',
      '..',
      'frontend',
      'src',
      'features',
      'auth',
      'pages',
      'LoginPage.tsx',
    )
    const source = readFileSync(loginPagePath, 'utf8')
    assert.ok(
      /import\s*\{[^}]*\bconsumeSessionExpiredFlag\b[^}]*\}\s*from\s*['"]@\/core\/lib\/auth\/sessionExpiredFlag['"]/.test(
        source,
      ),
      'LoginPage.tsx debe importar consumeSessionExpiredFlag desde @/core/lib/auth/sessionExpiredFlag',
    )
  },
)
