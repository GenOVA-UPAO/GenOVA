# BU-004: Logout roto — NG0203 en guestGuard y cookie de sesión nunca revocada

> Metadata (de `sdd/backlog.md` + ciclo del bug):

| Campo | Valor |
|---|---|
| ID | BU-004 |
| Tipo | Bug |
| Épica/Tema | EP-2: Plataforma Web y Autenticación |
| Sprint | Sprint 2 |
| Status | in_progress |
| Prioridad | Alta |
| Estimación | 2 SP |
| Dependencia | — |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-07-06 |
| Fecha actualización | 2026-07-06 |
| Fecha Fin (info) | — |

## Ruta de guardado
`sdd/bugs/BU-004_logout-roto-ng0203-cookie-viva.md`

## Resumen
"Cerrar sesión" no cierra la sesión: el usuario permanece en /dashboard con la
sesión activa. Detectado por el e2e `HU-008 Cerrar sesión` (CI run 28806657326)
y reproducido manualmente en el deploy develop (2026-07-06).

## Pasos para reproducir
1. Login como cualquier usuario en el deploy develop.
2. Menú de usuario → "Cerrar sesión".
3. La URL sigue en `/dashboard`; consola muestra `ERROR v: NG0203`; ninguna
   request a `/api/auth/logout`; recargar la página mantiene la sesión.

## Causa raíz (doble)
1. **`guestGuard` (auth.guard.ts): `inject(Router)` después de un `await`** —
   fuera del contexto de inyección en guards async → NG0203 y la navegación a
   /login queda cancelada. (`authGuard`/`adminGuard` capturan el Router antes
   del await; solo guestGuard tenía el patrón roto.)
2. **`AuthService.logout()` nunca llama a `POST /api/auth/logout`** — solo
   limpiaba estado local. La cookie httpOnly `genova_token` sigue viva, así que
   cualquier revalidación (`/api/auth/me`) reautentica al usuario y guestGuard
   lo rebota a /dashboard. El endpoint backend existe y revoca el jti + limpia
   la cookie; el frontend no lo usaba.

## Fix
- `guestGuard`: capturar `Router` antes del primer `await`.
- `logout()`: `await apiFetch("/api/auth/logout", {method:"POST"})` best-effort
  antes de limpiar estado y navegar; callers con `void`.

## Invariante (backprop §V)
En guards/funciones async de Angular: **todo `inject()` debe ejecutarse antes
del primer `await`**. Candidato a regla de reviewer/ESLint.
