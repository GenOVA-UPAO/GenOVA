import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Given, When, Then, After } from '@cucumber/cucumber'
import { Window } from 'happy-dom'

// BU-002 unit coverage — source-level assertions + behavior of `me.ts`.
//
// Two layers:
//   1. Static checks: imports/exports across SidebarMenu, Navbar, DashboardPage
//      so refactors that re-introduce `useState(getCachedUser()) + useEffect(getCurrentUser())`
//      fail loudly here.
//   2. Behavioral checks: getCurrentUser rejects on network failure instead
//      of silently returning stale cache.
//
// `useCurrentUser` is NOT imported directly here: the hook depends on
// `@/core/...` aliases that the unit tsx loader can't resolve, and React is
// not mounted by the harness anyway. The hook's `catch → getCachedUser()`
// fallback behavior is covered by reading the source file directly.
//
// IMPORTANTE: el BU-001 Before hook también instala happy-dom con su propio
// `Window`. Cuando corre entre escenarios, REEMPLAZA globalThis.sessionStorage
// por una instancia nueva. Para evitar divergencia entre el `sessionStorage`
// que ven mis steps y el que ve me.ts, trabajo SIEMPRE contra
// globalThis.sessionStorage (lo mismo que hace me.ts internamente).

let meLib
let authLib
let happyDomInstalled = false

function installHappyDomOnce() {
  if (happyDomInstalled) return
  const win = new Window()
  globalThis.window = win.window ?? win
  globalThis.sessionStorage = win.sessionStorage
  globalThis.localStorage = win.localStorage
  globalThis.CustomEvent = win.window.CustomEvent
  globalThis.fetch = (..._args) => {
    lastFetchCallCount += 1
    return fetchStub()
  }
  happyDomInstalled = true
}

let fetchStub = () => {
  throw new Error('apiFetch no inicializado en este escenario')
}
let lastFetchCallCount = 0

function readSource(relativeFromRepoRoot) {
  const here = dirname(fileURLToPath(import.meta.url))
  const repoRoot = join(here, '..', '..', '..')
  return readFileSync(join(repoRoot, relativeFromRepoRoot), 'utf8')
}

async function ensureEnv() {
  installHappyDomOnce()
  if (!meLib) meLib = await import('../../../frontend/src/core/lib/auth/me.ts')
  if (!authLib) authLib = await import('../../../frontend/src/features/auth/services/auth')
}

// ── Source-level checks ───────────────────────────────────────────────────────

Given('el archivo SidebarMenu.tsx del repositorio', function () {
  this.env = { source: readSource('frontend/src/core/layouts/components/SidebarMenu.tsx') }
})

Given('el archivo Navbar.tsx del repositorio', function () {
  this.env = { source: readSource('frontend/src/core/layouts/components/Navbar.tsx') }
})

Given('el archivo DashboardPage.tsx del feature student del repositorio', function () {
  this.env = { source: readSource('frontend/src/features/student/pages/DashboardPage.tsx') }
})

Given('el archivo useCurrentUser.ts del repositorio', function () {
  this.env = { source: readSource('frontend/src/features/auth/hooks/useCurrentUser.ts') }
})

Then('no contiene useEffect con dep [location.pathname] para getCurrentUser', function () {
  const src = this.env.source
  // BU-002 AC#10: la causa raíz fue `useEffect(() => getCurrentUser(), [location.pathname])`.
  // Trasladar el patrón al hook compartido elimina el re-fetch espurio.
  assert.ok(
    !/useEffect\s*\([^)]*getCurrentUser[^)]*\[[^\]]*location\.pathname[^\]]*\]/s.test(
      src,
    ),
    'SidebarMenu aún contiene useEffect con [location.pathname] que dispara getCurrentUser',
  )
})

Then('el archivo importa {string} desde el modulo {string}', function (symbol, _module) {
  const src = this.env.source
  const hookPath = '@/features/auth/hooks/useCurrentUser'
  assert.ok(
    new RegExp(
      `import\\s*\\{[^}]*\\b${symbol}\\b[^}]*\\}\\s*from\\s*['"]${hookPath.replace(/\//g, '\\/')}['"]`,
    ).test(src),
    `el archivo debe importar ${symbol} desde ${hookPath}`,
  )
})

Then('el archivo no importa {string} desde el modulo {string}', function (symbol, _module) {
  const src = this.env.source
  const mePath = '@/core/lib/auth/me'
  assert.ok(
    !new RegExp(
      `import\\s*\\{[^}]*\\b${symbol}\\b[^}]*\\}\\s*from\\s*['"]${mePath.replace(/\//g, '\\/')}['"]`,
    ).test(src),
    `el archivo no debe importar ${symbol} (debe delegar en el hook)`,
  )
})

Then(
  'el archivo no importa {string} ni {string} desde el modulo {string}',
  function (symbolA, symbolB, _module) {
    const src = this.env.source
    const mePath = '@/core/lib/auth/me'
    const escapedPath = mePath.replace(/\//g, '\\/')
    assert.ok(
      !new RegExp(
        `import\\s*\\{[^}]*\\b${symbolA}\\b[^}]*\\}\\s*from\\s*['"]${escapedPath}['"]`,
      ).test(src),
      `el archivo no debe importar ${symbolA}`,
    )
    assert.ok(
      !new RegExp(
        `import\\s*\\{[^}]*\\b${symbolB}\\b[^}]*\\}\\s*from\\s*['"]${escapedPath}['"]`,
      ).test(src),
      `el archivo no debe importar ${symbolB} (useCurrentUser ya lo gestiona)`,
    )
  },
)

Then('el archivo no define setRole local con useState', function () {
  const src = this.env.source
  assert.ok(
    !/useState\s*\(\s*[^)]*\bsetRole\b/s.test(src) && !/\bsetRole\s*\(/s.test(src),
    'DashboardPage no debe mantener un setRole local: el rol viene del hook',
  )
})

Then('define un fallback getCachedUser en su rama de error de red', function () {
  // BU-002: useCurrentUser() debe atrapar el rechazo de getCurrentUser y
  // devolver el último usuario cacheado para que la UI no regrese a null
  // en una caída transitoria de red.
  const src = this.env.source
  assert.ok(
    /catch\s*\{[\s\S]*?getCachedUser[\s\S]*?\}/.test(src),
    'useCurrentUser debe envolver getCurrentUser en try/catch y caer a getCachedUser',
  )
})

// ── Behavioral checks: getCurrentUser failure propagation ─────────────────────

Given('BU002: un usuario cacheado en sessionStorage {string}', async function (key) {
  await ensureEnv()
  globalThis.sessionStorage.setItem(
    key,
    JSON.stringify({ id: 1, role: 'administrador', email: 'a@x' }),
  )
})

Given('BU002: apiFetch rechaza con un error de red', async function () {
  await ensureEnv()
  fetchStub = () => Promise.reject(new TypeError('NetworkError'))
})

When('BU002: llamo a getCurrentUser', async function () {
  await ensureEnv()
  lastFetchCallCount = 0
  try {
    const r = await meLib.getCurrentUser()
    this.env = { ...(this.env || {}), lastGetResult: r, lastGetError: null }
  } catch (e) {
    this.env = { ...(this.env || {}), lastGetResult: null, lastGetError: e }
  }
})

Then('BU002: la promesa rechaza con un Error', function () {
  assert.ok(this.env.lastGetError, 'getCurrentUser debió haber lanzado')
  assert.ok(this.env.lastGetError instanceof Error, 'debe ser instancia de Error')
})

Then('BU002: el cache {string} sigue presente en sessionStorage', function (key) {
  assert.ok(
    globalThis.sessionStorage.getItem(key),
    `${key} debe seguir presente tras un error transitorio`,
  )
})

// ── Behavioral: markLoggedIn clears local cache ──────────────────────────────

When('BU002: llamo a markLoggedIn', async function () {
  await ensureEnv()
  authLib.markLoggedIn()
})

Then('BU002: el item {string} deja de existir en sessionStorage', function (key) {
  assert.equal(
    globalThis.sessionStorage.getItem(key),
    null,
    `${key} debe estar vacío tras markLoggedIn`,
  )
})

After(function () {
  if (globalThis.sessionStorage) globalThis.sessionStorage.clear()
  if (globalThis.localStorage) globalThis.localStorage.clear()
})