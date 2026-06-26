# EN-021: Error boundaries (frontend) y redacción de PII en logs (backend)

> Metadata:

| Campo | Valor |
|---|---|
| ID | EN-021 |
| Tipo | Habilitador |
| Épica/Tema | EP2: Plataforma & Auth |
| Sprint | Sprint 3 |
| Status | done |
| Prioridad | Alta |
| Estimación | 2 SP |
| Dependencia | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-06-26 |

## Objetivo

Resiliencia y seguridad transversales: (a) ningún error de render deja la pantalla en blanco;
(b) ningún log filtra PII/secretos (red de seguridad de la regla dura R8).

## Contexto

El frontend no tenía error boundaries (un throw → página en blanco). En backend, los logs podían
registrar correos/tokens por accidente pese a R8.

## Alcance

- Frontend: `RootErrorBoundary` (`react-error-boundary`) envuelve la app; fallback accesible
  responsive (tokens UPAO), reset al navegar, reporte a Sentry vía `captureException`.
- Backend: `RedactingFilter` enmascara correos, `Bearer`, JWT y claves con prefijo en todo log;
  **no** toca UUIDs/ids de job.

## Criterios de aceptación

- Un throw en cualquier ruta muestra el fallback (`role="alert"`, "Reintentar"); test de componente.
- `redact()` enmascara email/Bearer/JWT/claves y preserva UUIDs; tests unitarios verdes.

## Archivos

`frontend/src/core/components/RootErrorBoundary.jsx` (+ test), `frontend/src/core/lib/sentry.ts`,
`backend/core/log_redaction.py` (+ `backend/tests/test_log_redaction.py`), `backend/main.py`.
