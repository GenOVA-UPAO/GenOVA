# EN-019: Cola de jobs durable (arq + Redis) y rate-limit distribuido

> Metadata:

| Campo | Valor |
|---|---|
| ID | EN-019 |
| Tipo | Habilitador |
| Épica/Tema | EP7: Despliegue Cloud |
| Sprint | Sprint 3 |
| Status | done |
| Prioridad | Alta |
| Estimación | 5 SP |
| Dependencia | EN-013 |
| Fase | SDD - Implement |
| Fecha creación | 2026-06-26 |

## Objetivo

Encolar la generación de OVA en una cola **durable** (arq sobre Redis), procesada por un worker
separado, para que un redeploy/crash del web no pierda generaciones en curso; y respaldar el
rate-limit en Redis para que valga entre instancias.

## Contexto

`_launch` lanzaba `run_job` en un thread daemon dentro del proceso web: sin durabilidad, sin
reintentos, sin cancelación, compitiendo con el event loop. slowapi guardaba el rate-limit en
memoria (colapsa tras NAT/multi-instancia).

## Alcance

- `REDIS_URL` (opcional, soporta `rediss://` Upstash) en config. Sin él, todo cae al comportamiento
  anterior (thread inline + rate-limit en memoria).
- `queue.py` (enqueue sync-callable) + `worker.py` (`arq worker.WorkerSettings`, `ARQ_MAX_JOBS`).
- `_launch` encola si hay Redis; si falla el enqueue, corre inline (resiliencia).
- `core/rate_limit.py` usa `storage_uri=REDIS_URL`.

## Criterios de aceptación

- Sin `REDIS_URL`: comportamiento idéntico al anterior (thread inline), tests verdes.
- Con `REDIS_URL` + worker activo: el job lo procesa el worker; el web no se bloquea.
- Caída de Redis no rompe la creación de OVA (fallback inline).

## Archivos

`backend/generation/jobs/queue.py`, `backend/worker.py`, `backend/generation/jobs/jobs_router.py`,
`backend/core/rate_limit.py`. Operación: [docs/deployment.md](../../docs/deployment.md) § Worker.
