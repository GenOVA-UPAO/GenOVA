# Re-review BU-001 — Sesión expirada (focal sobre 4 hallazgos)

**Veredicto:** APPROVED

**Fecha:** 2026-06-29
**Revisor:** opencode (reviewer)
**Tipo:** re-review focal tras auto-fix del implementer

---

## Estado verify.ps1

`pwsh -NoProfile -ExecutionPolicy Bypass -File ./verify.ps1 -Quick`

```
PASA  Frontend lint (Biome, pnpm lint)        — 261 files, 0 errors
PASA  Backend ruff check
PASA  Backend deps parity (sync_deps.py --check)
PASA  Frontend unit BDD (pnpm test:unit)      — 68 scenarios (68 passed), 433 steps (433 passed)

RESULTADO FINAL: PASA
```

`pnpm --filter frontend typecheck` → PASA (sin errores TS).

Confirmación cruzada: `verify.ps1` reporta **68 scenarios** (antes 67), +1 = nuevo escenario "Sesión expirada redirige a /login y muestra mensaje informativo" se ejecuta y pasa.

---

## Hallazgo #1 — ✅ CERRADO

**Síntoma original**: `LoginPage` no consumía `consumeSessionExpiredFlag`, así que el toast "sesión expirada" nunca se mostraba.

**Evidencia del fix** (`frontend/src/features/auth/pages/LoginPage.tsx`):

- **Línea 11**: `import { consumeSessionExpiredFlag } from '@/core/lib/auth/sessionExpiredFlag'` — ruta correcta (`@/core/lib/auth/...` resuelve vía `tsconfig` paths).
- **Líneas 31–37**: `useEffect` con deps `[]` ejecuta al mount — patrón correcto (la flag es one-shot, se limpia en el primer consume).
- **Líneas 32–35**: si `consumeSessionExpiredFlag()` devuelve `true`, dispara `toast.info('Tu sesión ha expirado. Vuelve a iniciar sesión.', { duration: 6000 })`. `toast` viene de `sonner` (importado en línea 5), que ya está montado en `App.tsx:125` (`<Toaster position="top-right" richColors closeButton />`). API correcta.
- **198 líneas** (≤200) ✅.
- **Comentario en líneas 29–30** documenta el contrato del flag para futuros mantenedores.

**Cobertura de callers en producción** (verificado con grep recursivo en `frontend/src`):

| Función | Caller |
|---|---|
| `flagSessionExpired` | `AuthGate.tsx:49` ✅ |
| `consumeSessionExpiredFlag` | `LoginPage.tsx:32` ✅ |
| `clearSessionExpiredFlag` | ⚠️ **únicamente su definición en `sessionExpiredFlag.ts:34`** |

Nit menor (no bloqueante): `clearSessionExpiredFlag` se mantiene exportada pero sin caller actual. Es una API defensiva para flujos que necesiten limpiar la flag sin consumirla. El implementer podría eliminarla en una pasada anti-dead-code posterior (no afecta AC1 ni introduce bugs).

---

## Hallazgo #2 — ✅ CERRADO

**Síntoma original**: Los 4 escenarios BDD existentes solo cubrían mecánica de librería; ninguno verificaba el flujo user-visible "redirect + mensaje".

**Evidencia del fix**:

- **`tests/features/auth/BU-001_sesion-expirada.feature`**: 5 escenarios totales (4 previos + 1 nuevo "Sesión expirada redirige a /login y muestra mensaje informativo", líneas 32–39). Cuenta correcta.
- **`tests/steps/unit/sesion_expirada_unit.steps.js`**: nuevos steps en líneas 137–208. Implementación completa de Given/When/Then.
- **Ejecutado por `verify.ps1`**: el escenario pasa (cuenta total 68 scenarios, 433 steps — incremento coherente con +1 escenario de ~6 steps).

**Estrategia híbrida aplicada** (A+C):
- **A (contrato dinámico de la flag)**: el step `When LoginPage consume la flag de sesión expirada` llama `consumeSessionExpiredFlag()` y valida que la primera llamada devuelve `true` y la segunda `false`. Esto prueba el contrato compartido entre productor (AuthGate) y consumidor (LoginPage).
- **C (import estático de LoginPage)**: el step `Then LoginPage importa consumeSessionExpiredFlag desde sessionExpiredFlag` hace `readFileSync` del fuente y verifica con regex que el import existe (`import { consumeSessionExpiredFlag } from '@/core/lib/auth/sessionExpiredFlag'`).

**Limitación documentada** (líneas 127–135 de los steps): cucumber-js + happy-dom no monta React, así que el toast real no se observa en DOM. La cobertura es de wiring + contrato, no de render. Esto queda explícitamente aceptado por el implementer y es razonable para unit suite. Una cobertura E2E completa requeriría `@testing-library/react` o Playwright, fuera del alcance de un fix de bug.

**Evaluación**: cubre AC1 de forma suficiente — el flujo del usuario (AuthGate detecta → flag → LoginPage lee → toast) está validado en sus dos puntos de integración críticos.

---

## Hallazgo #3 — ✅ CERRADO

**Síntoma original**: doble `<AuthGate>` (uno en `ProtectedLayout` y otro dentro de `AppLayout`), generando redundancia de listeners/validaciones.

**Evidencia del fix**:

**`frontend/src/App.tsx`** (182 líneas):
- **`ProtectedLayout` (líneas 106–112)**: `<AuthGate><AppLayout /></AuthGate>` — única guarda para rutas estándar.
- **`FullBleedProtectedLayout` (líneas 114–120)**: `<AuthGate><AppLayout fullBleed /></AuthGate>` — única guarda para rutas workspace.
- **Cobertura completa de rutas autenticadas**:
  - `ProtectedLayout` cubre: `/dashboard`, `/mis-ovas`, `/papelera`, `/profile`, `/modelos`, `/fallback`, `/vinculacion`, `/analytics`, `/metodologia/engage`, `/metodologia/explore`, `/admin/roles`, `/admin/users`, `/admin/platform`.
  - `FullBleedProtectedLayout` cubre: `/crear-ova`, `/ova/job/:jobId/workspace`, `/ova/:ovaId/workspace`.
- **Rutas públicas** (sin gate, correcto): `/login`, `/register`, `/recuperar-contrasena`, `/reset-password`, `/verificar-correo`, `/`, `*`.

**`frontend/src/core/layouts/shells/AppLayout.tsx`** (31 líneas):
- ✅ NO importa `AuthGate` (verificado con grep — solo aparecen 2 menciones como **comentarios históricos** en líneas 6 y 8, no como imports).
- ✅ NO envuelve su contenido en `<AuthGate>`. Solo provee layout (Navbar + Sidebar + MainContainer/Outlet).
- ✅ Sin imports muertos.
- Comentario explicativo en líneas 6–9 documenta por qué el gating se centraliza en App.tsx (referencia a Hallazgo #3).

**Verificación manual de rutas**:
- `/dashboard` (sin sesión) → `ProtectedLayout` → `<AuthGate>` → `getCachedUser() === null` → `getCurrentUser()` da 401 → `clearCurrentUser('me')` → broadcast `auth:expired` → `<Navigate to="/login" state={{ sessionExpired: true }}>` ✅
- `/crear-ova` (fullBleed, sin sesión) → `FullBleedProtectedLayout` → `<AuthGate>` → mismo flujo ✅
- `/login` → fuera de ambos layouts, renderiza `LoginPage` directamente ✅

**Evaluación**: doble wrapping eliminado limpiamente, todas las rutas autenticadas siguen gateadas, sin regresión de cobertura.

---

## Hallazgo #4 — ✅ CERRADO

**Síntoma original**: `SidebarMenu.tsx` (227 líneas, pre-existente >200) modificado por BU-001 (TODO BU-002) sin plan de split documentado en `impl_*.md`.

**Evidencia del fix** (`sdd/progress/implementados/impl_BU-001_sesion-expirada.md` líneas 122–131):

```markdown
## Pendientes / Trabajo futuro (deuda técnica documentada)

### SidebarMenu.tsx requiere split (deuda técnica)
- **Archivo**: frontend/src/core/layouts/components/SidebarMenu.tsx (227 líneas, pre-existente >200)
- **Plan de split** (no en scope BU-001):
  1. Extraer <NavItems> a frontend/src/core/layouts/components/NavItems.tsx (lista, grouping, active state).
  2. Extraer <ProfileLink> a frontend/src/core/layouts/components/ProfileLink.tsx (avatar + dropdown).
  3. Extraer <MobileToggle> a frontend/src/core/layouts/components/MobileToggle.tsx (burger).
  4. Dejar SidebarMenu.tsx solo con composition + layout.
- **Ticket futuro**: pendiente de asignación (no en backlog actual).
```

Plan concreto y accionable: 4 archivos target con nombre + responsabilidad + ruta exacta. Cumple C3.

---

## Cambios requeridos
- Ninguno.

## Sugerencias opcionales (no bloqueantes)

1. **`clearSessionExpiredFlag` dead code** (`frontend/src/core/lib/auth/sessionExpiredFlag.ts:34`): exportada pero sin caller. Considerar eliminación en próxima pasada anti-dead-code (HU/EW futuro). Documentar en `impl_*.md` si se decide mantener como API defensiva.

2. **Cobertura E2E del toast**: el nuevo escenario BDD cubre el contrato y el wiring, pero no renderiza React. Una mejora futura sería un test con `@testing-library/react` que monte `<LoginPage>` en un `MemoryRouter`, simule `sessionStorage` con la flag, y verifique que `toast.info` se llama con el texto esperado (usando `vi.spyOn(toast, 'info')`). No es alcance de BU-001.

---

## Veredicto

**APPROVED** ✅

### Auto-actualización aplicada
- Ninguna.

### Backprop aplicado
- Ninguno (los fixes cerraron los hallazgos sin necesidad de nuevas invariantes §V).

---

## Sugerencias para el líder

- **Conventional commit message**:
  ```
  fix(auth): redirigir a /login con mensaje al expirar sesión (BU-001)
  ```

- **No hay merge impact**: BU-001 no introduce migraciones de BD ni cambia endpoints públicos. Cambios puramente client-side en frontend.

- **No hay doc impact obligatorio**: el flujo "sesión expirada → toast" es comportamiento interno del cliente, no afecta interfaz pública documentada. Si el líder lo desea, podría añadirse una nota en `docs/` sobre UX de expiración de sesión, pero no es bloqueante.

- **Estado en `feature_list.json`**: BU-001 puede pasar de `in_progress` → `done`. Asegúrate de añadir `"merge_commit": "<sha>"` tras el commit.

- **Nit a saber antes de commitear**: `clearSessionExpiredFlag` queda exportada sin caller. Si el líder prefiere cleanup estricto, pedir al implementer que la retire antes del commit; si no, aprobar tal cual (es defensiva API, no introduce bugs).

- **Próximo paso**: confirmar APPROVED al humano para que apruebe el commit y mueva `current.md` a `history.md`.