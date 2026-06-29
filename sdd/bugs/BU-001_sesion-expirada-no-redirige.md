# BU-001: Sesión expirada no redirige a pantalla de inicio de sesión

> Metadata (de `sdd/backlog.md` + ciclo del bug):

| Campo | Valor |
|---|---|
| ID | BU-001 |
| Tipo | Bug |
| Épica/Tema | EP-2: Plataforma Web y Autenticación |
| Sprint | Sprint 3 |
| Status | spec_ready |
| Prioridad | Alta |
| Estimación | 2 SP |
| Dependencia | HU-008 (Inicio de sesión con credenciales) |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-06-29 |
| Fecha actualización | 2026-06-29 |
| Fecha Fin (info) | — |

## Ruta de guardado
`sdd/bugs/BU-001_sesion-expirada-no-redirige.md`

## Resumen
La protección de rutas no detecta la expiración de la sesión JWT iniciada en la HU-008; al acceder a una ruta protegida con el token caducado, el usuario permanece en un estado inconsistente en lugar de ser redirigido automáticamente a la pantalla de inicio de sesión.

## Pasos para reproducir
1. Iniciar sesión como usuario autenticado desde `/login` (HU-008).
2. Esperar a que el token JWT caduque (24 h por defecto en HU-008) o invalidarlo manualmente en el backend / DevTools.
3. Sin cerrar la pestaña ni recargar, intentar acceder a una ruta protegida (p. ej. `/dashboard` o `/crear-ova`).
4. Observar el comportamiento del frontend.

## Comportamiento esperado
El guard de rutas protegidas (AuthGate o equivalente) detecta la sesión expirada al intentar entrar a una ruta protegida y redirige al usuario a `/login`, mostrando un mensaje informativo claro ("Tu sesión ha expirado, vuelve a iniciar sesión").

## Comportamiento actual
El frontend no detecta la sesión expirada tras el montaje inicial: la página puede mostrar contenido roto, lanzar errores 401 silenciosos desde la API o mantener al usuario en un estado inconsistente hasta que recarga manualmente o vuelve a iniciar sesión. Los errores 401 del backend son ignorados por el cliente.

## Causa raíz
El componente que protege las rutas privadas ejecuta una única verificación de sesión al montar y no vuelve a revalidarla. No escucha señales de expiración (evento `token-expired`), no reacciona ante respuestas 401 de la API y, en sesiones de larga duración, no revalida en cada navegación. El helper interno `isLoggedIn()` se mantiene como atajo optimista para chequeos puntuales, pero la protección principal es "una sola lectura al mount", por lo que cualquier cambio posterior en la validez del token pasa desapercibido.

## Solución propuesta
- **Mantener** `isLoggedIn()` como helper optimistic interno para chequeos puntuales. Su retirada del barrel queda pendiente para una futura pasada anti-dead-code (no es alcance de este bug).
- **Permitir** que el loader del AuthGate siga visible durante la validación post-login — no mostrar un estado "no autenticado" antes de confirmar la sesión activa (evita parpadeos y falsos positivos).
- **Implementar verificación reactiva de sesión** en el cliente:
  - Suscribirse a cambios del estado de autenticación (listener / store reactivo) de modo que cualquier caducidad o revocación del token se refleje en la UI.
  - Interceptar respuestas 401 de la API: forzar cierre de sesión y redirección a `/login` con mensaje informativo.
  - Re-evaluar la sesión en cambios de ruta (p. ej. en `useLocation`) para sesiones de larga duración.
- Dejar el hook/preparación para un futuro flujo de refresh-token (no se introduce aquí; queda como punto documentado).
- Añadir prueba BDD de regresión que cubra el escenario "sesión expirada en ruta protegida → redirige a `/login`".

## Criterios de verificación (criterios de aceptación)
1. Dada una sesión expirada, al acceder a una ruta protegida, el usuario es redirigido a `/login` con un mensaje informativo, sin necesidad de recargar manualmente la pestaña.
2. Durante la validación post-login, el loader del AuthGate permanece visible y no parpadea un estado "no autenticado" mientras se confirma la sesión.
3. Cualquier respuesta 401 proveniente del backend provoca el cierre de sesión local y la redirección automática a `/login`.
4. El helper `isLoggedIn()` se conserva y sigue disponible como atajo optimistic para chequeos puntuales donde se asume sesión activa.
5. Existe un test de regresión BDD que verifica que una sesión expirada en una ruta protegida redirige correctamente a la pantalla de inicio de sesión.

## Datos / señales implicadas
- Token JWT en cliente (localStorage según HU-008) con `expires_in` ≤ 24 h.
- Respuestas 401 del backend en endpoints protegidos.
- (Opcional, preparado a futuro) evento `token-expired` desde el backend o un refresh-token.

## Escenario de regresión (Gherkin)
```gherkin
Feature: Regresión BU-001 — Sesión expirada redirige a inicio de sesión

  Scenario: Sesión expirada redirige a la pantalla de inicio de sesión
    Given un usuario autenticado cuya sesión JWT ha expirado
    And el usuario no ha recargado la pestaña manualmente
    When el usuario intenta acceder a una ruta protegida del frontend
    Then el guard de rutas detecta la sesión expirada
    And el usuario es redirigido a "/login"
    And se muestra un mensaje informativo indicando que la sesión expiró
```

## Mockup ASCII - flujo afectado

```
┌─────────────────────────────────────────┐
│  [Ruta protegida]                       │
│                                         │
│   Estado: sesión expirada               │
│   (sin redirección visible hoy)         │
│                                         │
└─────────────────────────────────────────┘

          tras detectar 401 / token-expired

┌─────────────────────────────────────────┐
│  /login                                 │
│                                         │
│   "Tu sesión ha expirado.               │
│    Vuelve a iniciar sesión."            │
│                                         │
│   [ Iniciar sesión ]                    │
└─────────────────────────────────────────┘
```
