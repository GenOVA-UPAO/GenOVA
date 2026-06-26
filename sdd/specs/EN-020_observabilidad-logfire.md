# EN-020: Observabilidad con Pydantic Logfire

> Metadata:

| Campo | Valor |
|---|---|
| ID | EN-020 |
| Tipo | Habilitador |
| Épica/Tema | EP7: Despliegue Cloud |
| Sprint | Sprint 3 |
| Status | done |
| Prioridad | Media |
| Estimación | 2 SP |
| Dependencia | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-06-26 |

## Objetivo

Añadir tracing distribuido y **token/cost tracking** de las llamadas LLM mediante Logfire,
opt-in y sin PII, complementando a Sentry (errores) y Prometheus (`/metrics`).

## Contexto

No existía tracing ni accounting de tokens — crítico para un producto LLM. Logfire instrumenta
FastAPI + SQLAlchemy + SDK OpenAI con configuración de una línea.

## Alcance

- `LOGFIRE_TOKEN` (opcional) en config. Sin token, `init_logfire` es no-op (espeja Sentry).
- `core/observability.py` configura Logfire (`console=False`, environment) e instrumenta
  FastAPI + SQLAlchemy + OpenAI. Cableado en `main.py`.

## Criterios de aceptación

- Sin `LOGFIRE_TOKEN`: no-op, sin overhead ni envío externo (verificado por import-smoke).
- Con token: aparecen trazas de request + spans de llamadas LLM con uso de tokens.
- Nunca se envía PII (`capture_headers=False`, regla R8).

## Archivos

`backend/core/observability.py`, `backend/core/config.py`, `backend/main.py`.
