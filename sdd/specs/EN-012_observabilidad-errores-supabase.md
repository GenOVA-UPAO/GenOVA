# EN-012: Observabilidad de errores de generación en Supabase

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | EN-012 |
| Tipo | Habilitador |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | spec_ready |
| Prioridad | Alta |
| Estimación | 5 SP (inferido) |
| Dependencia | EN-008 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

## Objetivo

Registrar en Supabase cada error de generación de un recurso con un **Error ID**
opaco y rastreable, junto con su contexto saneado, para diagnosticar fallos
(modelo, tokens, timeouts, validación) sin exponer detalles internos al cliente.
Es el habilitador que da soporte al mensaje "Error ID" de **HU-022** y se integra
con **EN-013** (que marca los recursos en `error`).

## Contexto

Hoy el backend lanza un `500` genérico al fallar la generación
(`backend/agents/engage_router.py:169`) **sin identificador** ni registro. No
existe tabla de errores. El usuario quiere poder **buscar el error en Supabase**
por su Error ID. EN-012 añade la tabla, el helper de registro y la integración
con el job de EN-013.

## Alcance

### Incluye
- Tabla de errores en Supabase (Postgres) + migración.
- **Helper reusable** para registrar un error (sanea y persiste, devuelve `error_id`).
- Integración con EN-013: al quedar un recurso en `error`, se registra y se guarda el `error_id`.
- Sanitización del contenido registrado.

### No incluye
- El mensaje/UX "Error ID" en la interfaz (→ HU-022).
- La persistencia del estado del job (→ EN-013).
- Un panel/endpoint de análisis (se consulta en el dashboard de Supabase); un endpoint admin de consulta queda como extensión opcional fuera de alcance.
- Integración con servicios externos (Sentry/Datadog): se usa **Supabase**.

## Dependencias

- **EN-008** — base de datos (Supabase Postgres + SQLAlchemy) para la tabla.
- **EN-013** — invoca el registro cuando un recurso falla y almacena el `error_id` en `ova_job_resources.error_id`.
- Consumido por **HU-022** (muestra el Error ID).

## Reglas de negocio

1. **R1** — Existe una tabla **`ova_error_logs`** (migración) cuya PK es el **Error ID** (UUID).
2. **R2** — Un **helper reusable** (p. ej. `log_generation_error()` en un service) **sanea** el contenido y **persiste** el registro, devolviendo el `error_id`.
3. **R3** — El registro incluye: `error_id`, `ova_id` (nullable), `job_id`/`job_resource_id` (nullable), `user_id`, **categoría** de error (`model_error`, `token_limit`, `timeout`, `validation`, `other`), **mensaje técnico saneado** y `created_at`.
4. **R4** — **Sanitización**: el mensaje y el contexto **no** contienen API keys, tokens ni credenciales; se filtran antes de persistir.
5. **R5** — El **Error ID** que EN-013/HU-022 exponen al usuario **coincide** con el `error_id` registrado, permitiendo su búsqueda en Supabase.
6. **R6** — El cliente **nunca** recibe `str(e)`, stack ni el mensaje interno; solo el `error_id` (C4).
7. **R7** — Backend sigue router → service → model + migración y `commit_or_500()`; el registro de error **no** rompe el flujo (si falla el log, la generación continúa).
8. **R8** — Ningún archivo nuevo supera 200 líneas.

## Criterios de aceptación

- Al fallar la generación de un recurso, se crea un registro en `ova_error_logs` con un Error ID único y su categoría/contexto. **(R1, R3)**
- El helper de registro devuelve el `error_id` que EN-013 guarda en el recurso. **(R2, R5)**
- El registro no contiene tokens, API keys ni credenciales. **(R4, C4)**
- El cliente solo recibe el `error_id`, nunca el mensaje interno. **(R6, C4)**
- Si el registro del error falla, la generación no se interrumpe por ello. **(R7)**
- Ningún archivo nuevo supera 200 líneas y se respeta router → service → model. **(R8, C3, C7)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Observabilidad de errores de generación en Supabase (EN-012)

  Scenario: Registrar un error con Error ID
    Given un recurso cuya generación falla tras agotar reintentos
    When el backend registra el error
    Then se crea una fila en "ova_error_logs" con un Error ID único
    And el registro incluye categoría, ova_id, recurso y timestamp
    And el Error ID guardado coincide con el expuesto al usuario

  Scenario: El registro no filtra secretos
    Given un error cuyo mensaje interno contiene una API key
    When se registra el error
    Then el registro almacenado no contiene la API key ni tokens

  Scenario: Un fallo al registrar no interrumpe la generación
    Given una indisponibilidad temporal al escribir el log de error
    When el backend intenta registrar el error
    Then la generación del resto de recursos continúa
```
