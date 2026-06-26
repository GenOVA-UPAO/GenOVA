# EN-018: Progreso de generación en vivo (SSE)

> Metadata:

| Campo | Valor |
|---|---|
| ID | EN-018 |
| Tipo | Habilitador |
| Épica/Tema | EP5: Sistema Multiagente |
| Sprint | Sprint 3 |
| Status | done |
| Prioridad | Media |
| Estimación | 3 SP |
| Dependencia | EN-013 |
| Fase | SDD - Implement |
| Fecha creación | 2026-06-26 |

## Objetivo

Emitir el progreso de un job de generación por **Server-Sent Events** en vez de obligar al
frontend a hacer polling cada 2 s, para reflejar fase/recurso en tiempo casi real y reducir
peticiones, manteniendo el polling como red de seguridad.

## Contexto

El workspace consultaba `GET /api/ova/jobs/{id}` en bucle (`useOvaJob` + `refetchInterval`).
SSE empuja el mismo snapshot seguro (`job_to_dict`, sin contenido/secretos, R8) sobre una sola
conexión hasta estado terminal.

## Alcance

- Backend: `GET /api/ova/jobs/{id}/stream` con `sse-starlette`; owner-scoped; sesión DB fresca por
  tick (el runner escribe desde otro hilo); eventos `progress`/`done`/`error`; tope ~30 min.
- Frontend: `useJobStream` consume con `@microsoft/fetch-event-source` (cookies) y vuelca snapshots
  en la cache `['ovaJob', id]`; el poll baja a heartbeat de 15 s con SSE sano y vuelve a 2 s si falla.

## Criterios de aceptación

- Con backend+front arriba, crear un OVA abre una conexión `…/stream` (event-stream) y el progreso
  se actualiza sin polls de 2 s.
- Si el SSE falla/se corta, la generación sigue reflejándose vía polling (sin regresión).
- El stream nunca expone contenido de recurso ni credenciales.

## Archivos

`backend/generation/jobs/jobs_stream.py`, `frontend/src/features/ova_workspace/hooks/useJobStream.js`,
`frontend/src/features/ova_workspace/hooks/useOvaJob.js`. Ver [docs/mejoras-infra-2026-06.md](../../docs/mejoras-infra-2026-06.md) § 2.
