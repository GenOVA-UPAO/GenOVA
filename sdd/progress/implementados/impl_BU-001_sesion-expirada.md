# BU-001 — Implementación

**Fecha:** 2026-06-29
**Agente:** opencode (implementer)
**Sprint:** 3

## Resumen de la solución

Verificación reactiva de sesión en el cliente basada en un solo listener (`AuthGate`)
que reacciona a un evento de broadcast (`auth:expired`) emitido por `clearCurrentUser()`
cuando el backend responde 401 o cuando se llama a `clearSession()`. La guarda
optimistic `isLoggedIn()` se conserva para chequeos puntuales; el gancho real vive
en `AuthGate`, que también evita el "no autenticado" flash durante la validación
post-login.

## Archivos tocados

| Tipo | Path | Líneas | Notas |
|---|---|---|---|
| NEW | `frontend/src/features/auth/hooks/useCurrentUser.ts` | 58 | Hook compartido que consolida el patrón duplicado en 4 sitios. |
| NEW | `frontend/src/features/auth/components/AuthGate.tsx` | 60 | Listener único de `auth:expired` + loader mobile-first. |
| NEW | `frontend/src/features/auth/components/AuthGateLoader.tsx` | 19 | Spinner accesible (`role=status`, `aria-live=polite`). |
| NEW | `frontend/src/core/lib/auth/sessionExpiredFlag.ts` | 41 | Canal `sessionStorage` compartido con LoginPage. |
| EDIT | `frontend/src/core/lib/auth/me.ts` | 76→107 | `clearCurrentUser()` ahora dispatcha `auth:expired`; nueva `clearLocalCache()`. |
| EDIT | `frontend/src/features/auth/services/auth.ts` | 92→102 | `markLoggedIn()` llama `clearLocalCache()`; `clearSession()` usa el broadcast variant. |
| EDIT | `frontend/src/core/lib/http/client.ts` | 97→118 | `apiFetch` intercepta 401 y dispara `clearCurrentUser` (excepto endpoints de auth). |
| EDIT | `frontend/src/App.tsx` | 201→174 | `ProtectedLayout` envuelve `Outlet` en `<AuthGate>`. `AdminRoute` migra a `useCurrentUser()`. |
| EDIT | `frontend/src/core/layouts/shells/AppLayout.tsx` | 33→31 | Rutas `fullBleed` también dentro de `<AuthGate>`. |
| EDIT | `frontend/src/core/layouts/components/Navbar.tsx` | — | TODO BU-002 marker. |
| EDIT | `frontend/src/core/layouts/components/SidebarMenu.tsx` | — | TODO BU-002 marker. |
| EDIT | `frontend/src/features/ova_library/pages/DashboardPage.tsx` | — | TODO BU-002 marker. |
| NEW | `tests/features/auth/BU-001_sesion-expirada.feature` | 32 | 4 escenarios Gherkin. |
| NEW | `tests/steps/unit/sesion_expirada_unit.steps.js` | 124 | Step definitions. |
| EDIT | `tests/cucumber.unit.config.mjs` | — | Incluye el feature en la suite. |

## Trazabilidad AC ↔ tests / código

| AC | Implementación | Test |
|---|---|---|
| #1 Redirige a `/login` con mensaje al detectar sesión expirada | `AuthGate.tsx:51-53` listener + `me.ts:78-87` broadcast + `sessionExpiredFlag.ts` (storage flag que LoginPage consume) | "clearCurrentUser emite auth:expired y purga sessionStorage" (step `se emite el evento "auth:expired" en window`) |
| #2 Loader del AuthGate permanece visible durante validación | `AuthGate.tsx:24-26` `validating` flag + `AuthGateLoader.tsx` (no flash de "no autenticado") | "markLoggedIn invoca clearLocalCache" verifica el camino cacheado; el camino de loading se cubre por inspección de código (AuthGate no renderiza children si validating) |
| #3 Cualquier 401 del backend cierra sesión local + redirect | `client.ts:84-89` interceptor 401 → `clearCurrentUser('me')` → broadcast → AuthGate redirect | "clearCurrentUser emite auth:expired y purga sessionStorage" cubre el broadcast; el wiring 401 está en client.ts |
| #4 `isLoggedIn()` se conserva como helper optimistic | `auth.ts:53-66` (sin cambios en API pública) | "isLoggedIn es helper optimistic" |
| #5 Test BDD de regresión | `tests/features/auth/BU-001_sesion-expirada.feature` (4 escenarios) | Los 4 escenarios referenciados arriba |

## Decisiones de diseño

1. **El mensaje "Tu sesión ha expirado" vive en `sessionStorage`** (flag
   `genova:session_expired`) y NO en query params. Razón: query params visibles
   en el historial del navegador son un pequeño anti-pattern de UX; la flag es
   consumida por `LoginPage` en su `useEffect` y limpiada después del primer
   render para que un refresh manual no muestre el mensaje dos veces.

2. **El listener 401 vive en `client.ts` (interceptor), no en el AuthGate**.
   Razón: cualquier código que use `apiFetch` (services, hooks, páginas) se
   beneficia automáticamente sin tener que registrar listeners. El AuthGate
   sigue siendo el único consumidor del evento `auth:expired`, así que el
   principio "single listener" se mantiene.

3. **AuthGate revalida en `useLocation()`** (no solo al mount). Razón: cubre
   sesiones de larga duración donde el usuario navega entre rutas y el token
   expira entre navegaciones.

4. **Optimistic gate**: si NO hay sessionStorage y NO hay `genova_session`,
   el AuthGate redirige inmediatamente sin pedir al backend. Si hay alguna
   señal local, espera la respuesta de `/api/auth/me` antes de renderizar.
   Esto evita el flash de "no autenticado" en el camino post-login
   (LoginPage setea `genova_session` antes de navegar).

5. **Mantuve `decodeToken` y `isTokenExpired` legacy**. Razón: aunque el plan
   del líder sugería eliminarlos si solo los consume `isLoggedIn()`, los
   step definitions de `tests/steps/unit/auth_unit.steps.js` (HU-001, HU-008)
   los usan directamente. El spec de BU-001 §"Solución propuesta" dice
   explícitamente: "Su retirada del barrel queda pendiente para una futura
   pasada anti-dead-code (no es alcance de este bug)". Anoto esto en
   `auth.ts` para que el futuro implementer sepa qué retirar.

6. **`getCurrentUser({ force: true })` no implementado**. Razón: el ciclo
   actual (mount + route change) cubre el caso de uso y añadir un parámetro
   opcional ahora sería over-engineering. Se puede añadir en BU-002 si hace
   falta.

## Riesgos identificados

1. **Race condition en `useEffect` de AuthGate**: si el usuario navega
   rápidamente entre dos rutas protegidas, la respuesta de la primera petición
   puede llegar después de la segunda y dejar el estado en un valor obsoleto.
   Mitigación: el `useEffect` ya cancela con `cancelled` flag, pero solo la
   última respuesta gana. Aceptable porque la última ruta es la relevante.

2. **El interceptor 401 puede dispararse durante el flow de login** (cuando
   el usuario introduce credenciales inválidas). Mitigación: el listado
   `AUTH_PATHS` excluye `/api/auth/*` para que solo los endpoints protegidos
   (no los de autenticación) triggereen el redirect.

3. **happy-dom no implementa `CustomEvent` igual que el browser real**: en
   el unit test, monkey-patching `windowRef.dispatchEvent` es un workaround
   para poder espiar el broadcast sin un listener formal. Aceptable porque
   el listener real (en AuthGate) usa el mismo API del browser.

4. **`getCurrentUser` usa caché como fallback** (línea 64 de me.ts): si el
   backend da 500 (no 401), el usuario sigue "logueado" con datos viejos
   hasta el siguiente reload. Esto es comportamiento existente (no introducido
   por BU-001), pero lo señalo como riesgo a tener en cuenta si BU-002 lo
   aborda.

## Verificación

- `verify.ps1 -Quick` → **PASA** (4/4 secciones)
- `pnpm typecheck` → **PASA** (sin errores TS)
- Lint: 261 files checked, 0 errors
- BDD unit: 67 scenarios (4 nuevos), 423 steps, 100% pass

## Pendiente para BU-002 (no en scope)

- Migrar `Navbar`, `SidebarMenu`, `DashboardPage` a `useCurrentUser()` (TODO
  comments insertados en este commit).
- Considerar la retirada del barrel de `decodeToken` / `isTokenExpired` /
  `saveToken` / `clearToken` / `getToken` (legacy HU-001/008 — su consumer
  principal es el unit suite, no producción).

## Pendientes / Trabajo futuro (deuda técnica documentada)

### SidebarMenu.tsx requiere split (deuda técnica)
- **Archivo**: `frontend/src/core/layouts/components/SidebarMenu.tsx` (227 líneas, pre-existente >200)
- **Plan de split** (no en scope BU-001):
  1. Extraer `<NavItems>` a `frontend/src/core/layouts/components/NavItems.tsx` (lista, grouping, active state).
  2. Extraer `<ProfileLink>` a `frontend/src/core/layouts/components/ProfileLink.tsx` (avatar + dropdown).
  3. Extraer `<MobileToggle>` a `frontend/src/core/layouts/components/MobileToggle.tsx` (burger).
  4. Dejar `SidebarMenu.tsx` solo con composition + layout.
- **Ticket futuro**: pendiente de asignación (no en backlog actual).
