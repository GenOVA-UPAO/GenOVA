# BU-002: Sesión activa cambia de rol o cuenta al navegar entre páginas

| Campo | Valor |
|---|---|
| ID | BU-002 |
| Tipo | Bug |
| Épica/Tema | EP-2: Plataforma Web y Autenticación |
| Sprint | Sprint 3 |
| Status | spec_ready |
| Prioridad | Media |
| Estimación | 3 SP |
| Dependencia | BU-001 (Sesión expirada no redirige) — debe estar mergeado antes de implementar BU-002 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-06-29 |
| Fecha actualización | 2026-06-29 |
| Fecha Fin (info) | — |

## Ruta de guardado
`sdd/bugs/BU-002_cuenta-rol-cambia-navegacion.md`

## Resumen
Al navegar entre varias páginas dentro de la misma sesión, la cuenta y/o el rol mostrados en el navbar y el sidebar pueden cambiar a otro usuario (por ejemplo, `usuario_test` o `usuario`), aunque el usuario autenticado siga siendo el mismo. Como consecuencia, un administrador pierde acceso al panel de modelos y a las rutas `/admin*` sin haber cerrado sesión.

El origen es doble: (1) frontend que monta un snapshot momentáneo de un "usuario anterior" desde `sessionStorage` antes de que termine el fetch de `/api/auth/me`, y (2) backend que no tiene un criterio explícito de "rol primario" del usuario y devuelve el primero alfabético, lo que combinado con la caché frontend stale produce el síntoma observado.

## Pasos para reproducir
1. Iniciar sesión como usuario con rol `administrador` y verificar que el sidebar muestra el panel de modelos y la entrada `/admin`.
2. Dentro de la misma sesión, navegar secuencialmente entre varias páginas internas (por ejemplo: `/dashboard`, `/mis-ovas`, `/crear-ova`, `/admin/users`, `/perfil`, `/admin`).
3. Observar el nombre de usuario y el rol mostrados en el navbar y el sidebar tras cada navegación.
4. Intentar acceder al panel de modelos (`/admin`) o a una ruta que requiera rol `administrador`.

## Comportamiento esperado
Tras cualquier navegación entre páginas dentro de la misma sesión, el navbar y el sidebar reflejan de forma consistente la cuenta y el rol del usuario autenticado. Un usuario con rol `administrador` mantiene el acceso a `/admin` y a las rutas administrativas mientras la sesión siga activa. Tras un ciclo de logout + login con otro usuario, la nueva sesión muestra la cuenta y el rol correctos del nuevo usuario sin residuos del anterior.

## Comportamiento actual (síntoma observado)
Tras varias navegaciones, el navbar y/o el sidebar muestran un nombre de usuario y/o un rol distintos a los del usuario autenticado (por ejemplo, `usuario_test` o `usuario` cuando se esperaba `administrador`). El usuario administrador pierde acceso al panel de modelos y a las rutas `/admin` y `/admin/users` sin haber cerrado sesión, hasta recargar la pestaña manualmente o volver a iniciar sesión. En algunos casos el sidebar muestra entradas de un rol de menor privilegio mezcladas con las del rol real.

## Causa raíz

Dos causas concurrentes identificadas en el código:

### Causa #1 — Frontend: snapshot momentáneo de "usuario anterior"
- `frontend/src/core/lib/auth/me.ts:38-40` lee `sessionStorage['genova_me']` de forma sincrónica.
- Cuatro componentes inicializan `useState(getCachedUser())` con esa lectura:
  - `frontend/src/core/layouts/components/Navbar.tsx:44`
  - `frontend/src/core/layouts/components/SidebarMenu.tsx:113`
  - `frontend/src/App.tsx:93` (AdminRoute)
  - `frontend/src/features/student/pages/DashboardPage.tsx:43`
- `frontend/src/core/layouts/components/SidebarMenu.tsx:128-137` declara un `useEffect` con dependencia `[location.pathname]` que re-dispara `getCurrentUser()` en cada navegación, sobrescribiendo la caché y el estado con datos potencialmente stale.
- `frontend/src/core/lib/auth/me.ts:45-67` retorna `readCache()` (datos stale) ante error de red, y limpia la caché en `401` sin notificar a los consumidores.
- Conclusión: un componente puede montar y renderizar el snapshot de un usuario anterior desde `sessionStorage` antes de que termine la llamada a `/api/auth/me` del usuario real.

### Causa #2 — Backend: selección ambigua del rol primario
- `backend/auth/session_router.py:56-82`: el endpoint `GET /api/auth/me` retorna `role = roles[0]` ordenado alfabéticamente por nombre. No existe un criterio explícito de "rol primario" del usuario.
- `backend/seed.py:110-144`: añade los roles faltantes al usuario seed sin borrar los previos, lo que produce acumulación de filas en `user_roles` entre ejecuciones consecutivas del seed.

## Solución propuesta

### Backend

**Nueva migración `backend/migrations/034_user_roles_is_primary.sql`**:
- Añadir la columna `user_roles.is_primary BOOLEAN NOT NULL DEFAULT FALSE`.
- Crear índice único parcial: `CREATE UNIQUE INDEX ux_user_roles_one_primary_per_user ON user_roles(user_id) WHERE is_primary = TRUE;` (un solo `is_primary=TRUE` por usuario).
- Backfill: `UPDATE user_roles SET is_primary = TRUE` para la fila cuyo rol asociado tenga el mayor `count(role_permissions)`. En empate, dejar todos los `is_primary` en `FALSE` (no asumir).
- `DOWN`: `DROP INDEX` + `DROP COLUMN`.

**Editar `backend/auth/session_router.py:56-82`** (`GET /api/auth/me`):
- Devolver `role` = nombre del `user_role` con `is_primary=TRUE` del usuario autenticado.
- Fallback: role con mayor `count(role_permissions)` si no existe ninguna fila con `is_primary=TRUE`.
- Si el usuario no tiene roles asignados: `role=null`.

**Editar `backend/seed.py:110-144`**:
- Ejecutar `DELETE FROM user_roles WHERE user_id = ?` antes de re-asignar roles al usuario seed → el seed es idempotente entre runs.

### Frontend

**Editar `frontend/src/core/lib/auth/me.ts`**:
- `getCurrentUser()` propaga un error explícito ante fallo de red; NO retorna `readCache()` como respuesta silenciosa.
- `writeCache(user)` recibe el `user.role` ya validado como primario por el backend.
- Reusar `clearLocalCache()` (introducido por BU-001).
- Mantener ≤200 líneas.

**Editar `frontend/src/features/auth/services/auth.ts`**:
- `markLoggedIn()` invoca `clearLocalCache()` antes de la primera llamada a `/api/auth/me` tras un login exitoso.
- Mantener ≤200 líneas.

**Editar `frontend/src/core/layouts/components/SidebarMenu.tsx`**:
- Quitar la dependencia `[location.pathname]` del `useEffect` de `getCurrentUser()`. Esta es la causa raíz del re-fetch espurio en cada navegación. Pasar a `[]` (mount-only) o `[user?._id]` para que el fetch se ejecute una sola vez.
- Migrar el consumo de `getCurrentUser()` al hook `useCurrentUser()` provisto por BU-001.
- Mantener ≤200 líneas.

**Editar `frontend/src/core/layouts/components/Navbar.tsx`**:
- Migrar el consumo al hook `useCurrentUser()`.
- Mantener ≤200 líneas.

**Editar `frontend/src/features/student/pages/DashboardPage.tsx`**:
- Migrar el consumo al hook `useCurrentUser()`. El `setRole` local deja de existir; el rol viene del hook.
- Mantener ≤200 líneas.

**Editar `frontend/src/App.tsx`** (AdminRoute):
- Migrar el consumo al hook `useCurrentUser()`.

## Reglas arquitectónicas (constraints)
- **≤200 líneas por archivo** creado o editado.
- **Screaming-arch**: el código nuevo de auth vive en `frontend/src/features/auth/{hooks,components}/`. Lo viejo en `frontend/src/core/lib/auth/` queda solo como utilidad compartida de caché.
- **Anti-spaghetti**: nada de `setRole` local ni side effects inline sobre `role` en los componentes. El hook `useCurrentUser()` (de BU-001) es la única fuente de verdad.
- **Modularizar**: los 4 componentes (Navbar, SidebarMenu, AdminRoute en App.tsx, DashboardPage) migran al hook de BU-001 — dependencia explícita: **BU-001 debe estar mergeado antes de implementar BU-002**.
- **Código muerto**: eliminar el código defensivo de roles que ya no aplica con `is_primary` resuelto en backend (revisar `me.ts`, `auth.ts` y consumidores).
- **Responsive**: la migración del `SidebarMenu` no introduce regresión mobile.
- **No tocar** ningún otro archivo fuera del scope.

## Dependencias
- **BU-001** (Sesión expirada no redirige): provee el hook `useCurrentUser()` y la utilidad `clearLocalCache()` que consumen los 4 componentes migrados. **Debe estar mergeado antes de implementar BU-002**.

## Criterios de verificación
1. `GET /api/auth/me` devuelve `role` igual al nombre del `user_role` con `is_primary=TRUE` para el usuario autenticado, cuando esa fila existe.
2. Si ninguna fila de `user_roles` tiene `is_primary=TRUE`, `GET /api/auth/me` devuelve el rol con mayor `count(role_permissions)` del usuario autenticado.
3. Si el usuario autenticado no tiene roles asignados, `GET /api/auth/me` devuelve `role=null`.
4. El índice único parcial `ux_user_roles_one_primary_per_user` rechaza cualquier `INSERT` o `UPDATE` que intenten crear una segunda fila con `is_primary=TRUE` para el mismo `user_id`.
5. El backfill de la migración marca `is_primary=TRUE` únicamente en la fila cuyo rol tenga el mayor `count(role_permissions)`; en caso de empate deja todas las filas con `is_primary=FALSE`.
6. La migración `034_user_roles_is_primary.sql` define operaciones `UP` y `DOWN` ejecutables sin pérdida de datos del resto de columnas.
7. `seed.py` borra los `user_roles` previos del usuario seed antes de re-asignar, de modo que dos ejecuciones consecutivas producen exactamente el mismo conjunto de filas en `user_roles` para ese usuario.
8. `getCurrentUser()` propaga un error explícito ante fallo de red y nunca retorna `readCache()` como respuesta silenciosa.
9. `markLoggedIn()` invoca `clearLocalCache()` antes de la primera llamada a `/api/auth/me` tras un login exitoso.
10. `SidebarMenu` ya no re-dispara `getCurrentUser()` al cambiar `location.pathname`; su `useEffect` se ejecuta una sola vez al montar.
11. `Navbar`, `AdminRoute` (en `App.tsx`) y `DashboardPage` consumen `useCurrentUser()` y no mantienen estado local de `role` con `setRole`.
12. Ningún archivo creado o editado supera las 200 líneas.
13. La migración del `SidebarMenu` no introduce regresión responsive en mobile.
14. Existen 6 escenarios BDD unitarios cubriendo: rol primario en `/api/auth/me`, fallback por permisos, swap de usuario tras logout + login, idempotencia del seed, no re-fetch en navegación, y unicidad de `is_primary`.

## Datos / entidades implicadas
- Tabla `user_roles` (nueva columna `is_primary` con índice único parcial).
- Tabla `role_permissions` (consulta de `count(*)` para el fallback del backend).
- Endpoint `GET /api/auth/me` (`backend/auth/session_router.py`).
- Script de seed (`backend/seed.py`).
- Módulo de caché frontend (`frontend/src/core/lib/auth/me.ts`).
- Servicio de auth frontend (`frontend/src/features/auth/services/auth.ts`).
- Componentes de layout y dashboard: `SidebarMenu`, `Navbar`, `App` (AdminRoute), `DashboardPage`.
- Hook compartido `useCurrentUser()` y utilidad `clearLocalCache()` (provistos por BU-001).

## Escenarios de regresión (Gherkin)

```gherkin
Feature: Regresión BU-002 — Sesión no cambia de rol o cuenta al navegar

  Scenario: rol primario se respeta en /api/auth/me
    Given un usuario con los roles "administrador" y "usuarios_prueba" asignados en user_roles
    And la fila de "administrador" en user_roles tiene is_primary=TRUE
    When se hace GET /api/auth/me autenticado como ese usuario
    Then la respuesta contiene role="administrador"

  Scenario: sin is_primary se usa el de mayor permisos
    Given un usuario con los roles "usuario" (5 permisos) y "estudiante" (3 permisos)
    And ninguna fila en user_roles tiene is_primary=TRUE
    When se hace GET /api/auth/me autenticado como ese usuario
    Then la respuesta contiene role="usuario"

  Scenario: logout + login con otro usuario no muestra datos del anterior
    Given el usuario A autenticado y la SidebarMenu montada mostrando el nombre y rol de A
    When A cierra sesión
    And B inicia sesión en la misma pestaña
    And la SidebarMenu se monta con la sesión de B
    Then la SidebarMenu muestra el nombre y rol de B (no los de A)

  Scenario: seed no duplica roles en runs consecutivos
    Given el seed ejecutado una vez para el usuario admin@upao.pe
    When el seed se ejecuta por segunda vez para el mismo usuario
    Then la tabla user_roles contiene exactamente las mismas filas que tras la primera ejecución
    And no hay duplicados por (user_id, role_id)

  Scenario: SideBarMenu no re-fetch en navegación
    Given la SidebarMenu montada en la ruta /dashboard
    When el usuario navega secuencialmente a 5 rutas distintas (/mis-ovas, /crear-ova, /perfil, /admin/users, /admin)
    Then el endpoint /api/auth/me se ha llamado como máximo 1 vez
    And no 5 veces

  Scenario: is_primary único por user
    Given dos filas en user_roles con is_primary=TRUE para el mismo user_id
    When un INSERT o UPDATE intenta marcar una tercera fila como is_primary=TRUE para ese user_id
    Then la base de datos rechaza la operación por violación del índice único parcial
```

## Mockup ASCII — síntoma observado en navbar / sidebar

```
Sesión "estable" (admin@upao.pe)    Tras ~5 navegaciones
+-------------------------+          +-------------------------+
| genova   admin@upao.pe  |          | genova  usuario_test    |
|-------------------------|          |-------------------------|
| * Inicio                |          | * Inicio                |
| * Mis OVAs              |          | * Mis OVAs              |
| * Crear OVA             |    -->   | * Crear OVA             |
| * Admin                 |          | * Perfil                |
|   └ Usuarios            |          |                         |
|   └ Roles               |          | (sin /admin, /admin/    |
|   └ Modelos             |          |  users, /admin/roles)   |
+-------------------------+          +-------------------------+
```
