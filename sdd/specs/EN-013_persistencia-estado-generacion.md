# EN-013: Persistencia del estado de generación (jobs)

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | EN-013 |
| Tipo | Habilitador |
| Épica/Tema | EP3: Interfaz de Creacion y Gestion de OVAs |
| Sprint | Sprint 1 |
| Status | spec_ready |
| Prioridad | Alta |
| Estimación | 8 SP (inferido) |
| Dependencia | EN-008 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-05-15 (inferido) |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-05-20 (inferido) |

## Objetivo

Persistir en base de datos el estado de cada generación de OVA (un **job** por
generación, con progreso **por recurso** —cada elemento generable dentro de una
fase: texto, imagen, código, ejercicio, etc.—) y mover la **orquestación de la
generación inicial del navegador al servidor**, de modo que la generación
continúe aunque el cliente se desconecte y su estado pueda consultarse para
reanudar. Es el habilitador de infraestructura que consumen HU-022 (recuperar
recursos parciales) y HU-023 (background + reanudar desde "Mis OVAs").

## Contexto

Hoy la generación inicial es **síncrona y orquestada desde el frontend**
(`frontend/src/hooks/useOvaCreation.js`): el navegador genera fase a fase y solo
al final llama a `POST /api/ova/save`. El único "job" existente es el de
**regeneración** (edición), y vive **in-memory** (`backend/ova/regen_service.py`,
dict de progreso), por lo que se pierde ante reinicio/duerme de Render free y no
es consultable desde otra pestaña. No existe tabla de jobs ni estado por recurso.

## Alcance

### Incluye
- Modelo de datos de jobs (`ova_jobs`) y de progreso por recurso (`ova_job_resources`) + migración `018`.
- Endpoint para **iniciar** una generación como job server-side.
- Orquestación de la generación en el servidor (hilo background), reusando los agentes existentes.
- Persistencia **incremental** del contenido de cada fase apenas se completa.
- Endpoint de **consulta de progreso** (polling) y lookup de job por OVA/usuario.
- Reintentos y timeouts por recurso reflejados en el estado.
- Endpoint para **continuar** las fases pendientes de un job interrumpido.

### No incluye
- UI de reanudar / botón en "Mis OVAs" (→ HU-023).
- Mensaje "Lo sentimos… Error ID" en la ubicación del recurso ni la marca "X" (→ HU-022).
- Registro detallado del error en Supabase para análisis (→ EN-012; aquí solo se persiste el `error_id` y el estado).
- Cola externa (Celery/Redis/SQS), WebSockets, ni coordinación distribuida multi-worker.
- Cambios a prompts o a los agentes de generación.

## Dependencias

- **EN-008** (base de datos / PostgreSQL Supabase + SQLAlchemy): requerido para las tablas y persistencia.
- Reusa: `backend/ova/regen_agents.py` (mapeo fase→agente), `backend/agents/llm_router.py` (`generar_texto`, `LLM_TIMEOUT_S`), `backend/agents/html_validator.py`.
- Habilita: **HU-022**, **HU-023**, **EN-012**.

## Reglas de negocio

1. **R1** — Cada generación crea un registro `ova_jobs` con `status ∈ {queued, running, done, error, interrupted, canceled}`, atado a `user_id` y (cuando exista) `ova_id`.
2. **R2** — El progreso se persiste **por recurso** en `ova_job_resources` (una fila por **recurso** —cada elemento generable: texto, imagen, código, ejercicio, etc.— dentro de una fase; una fase agrupa varios recursos): `status ∈ {pending, running, done, error}`, `resource_type`, `attempts`, `error_id` (nullable), referencia a su contenido.
3. **R3** — La generación se orquesta en el **servidor**: el endpoint de inicio crea el job y lanza la ejecución en un **hilo background** (mismo proceso), reusando los agentes existentes. El cliente no orquesta fases.
4. **R4** — **Persistencia incremental**: el contenido de cada fase se guarda en BD apenas se completa (no solo al final), de modo que un fallo posterior no pierde lo ya generado.
5. **R5** — El estado del job y de sus recursos es **consultable por polling** mediante un endpoint, sin depender de la conexión que inició la generación.
6. **R6** — Cada recurso se reintenta hasta **2 veces** y respeta `LLM_TIMEOUT_S`; agotados los reintentos queda `error` con un `error_id` opaco (UUID). El fallo de un recurso **no aborta** los demás.
7. **R7** — **Reanudar** = continuar solo las fases con `status ∈ {pending, error}`; las `done` no se regeneran. Un job cuyo proceso murió se marca `interrupted` y puede continuarse.
8. **R8** — Seguridad: endpoints autenticados (cookie JWT), con `@limiter.limit`, `job_id` opaco (UUID v4), y **el cliente nunca recibe `str(e)` ni tokens** — solo `status` + `error_id` (se usan helpers `commit_or_500()`).
9. **R9** — El job queda **ligado al OVA y al usuario**, de modo que "Mis OVAs" (HU-023) pueda localizar una generación en curso por `ova_id`/`user_id`.

## Modelo de datos (migración `018_ova_generation_jobs.sql`)

`ova_jobs`
- `id` UUID PK
- `user_id` FK → users (NOT NULL)
- `ova_id` FK → ovas (NULL hasta materializar el OVA)
- `status` TEXT NOT NULL DEFAULT 'queued'
- `prompt` TEXT, `params` JSONB (llm elegido, uploads asociados, fases solicitadas)
- `created_at`, `updated_at`, `started_at` (NULL), `finished_at` (NULL)

`ova_job_resources` *(una fila por **recurso**: elemento generable dentro de una fase; una fase 5E agrupa varios recursos)*
- `id` UUID PK
- `job_id` FK → ova_jobs (NOT NULL, ON DELETE CASCADE)
- `phase_type` TEXT, `phase_order` INT — fase 5E a la que pertenece el recurso
- `resource_type` TEXT — tipo del recurso (texto, imagen, código, ejercicio, …)
- `resource_order` INT — orden del recurso dentro de la fase
- `status` TEXT NOT NULL DEFAULT 'pending'
- `attempts` INT NOT NULL DEFAULT 0
- `error_id` TEXT NULL
- `ova_phase_id` FK → ova_phases (NULL) **o** `content` TEXT (contenido incremental)
- `updated_at`
- Índice por `(job_id, phase_order, resource_order)`.

Modelos ORM `OvaJob` y `OvaJobResource` en `backend/models.py`.

## Contratos de API

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/ova/jobs` | Inicia una generación (body: `prompt`, `llm`, `upload_ids?`, `phases?`). Crea el job, lanza el hilo y retorna `{ job_id, status: "queued" }`. Rate-limited. |
| `GET` | `/api/ova/jobs/{job_id}` | Estado del job + lista de recursos (`status`, `attempts`, `error_id`). Solo el dueño. |
| `GET` | `/api/ova/jobs?ova_id={id}` | Localiza el job (en curso/último) de un OVA del usuario (para HU-023). |
| `POST` | `/api/ova/jobs/{job_id}/resume` | Continúa las fases `pending`/`error` de un job `interrupted`/`error`. |

Patrón backend: `backend/ova/jobs_router.py` (HTTP) → `backend/ova/jobs_service.py`
(orquestación, hilo, reintentos) → `backend/models.py`. Respetar < 200 líneas/archivo
(separar p. ej. `jobs_service.py` de un `jobs_runner.py` si hace falta).

## Criterios de aceptación

- El inicio de una generación crea un `ova_jobs` con estado inicial y una fila `ova_job_resources` por fase solicitada. **(R1, R2)**
- Tras iniciar, cerrar/recargar la pestaña del cliente **no detiene** la generación; al volver a consultar, el progreso refleja las fases completadas mientras el cliente estuvo desconectado. **(R3, R5)**
- Cada fase completada queda persistida en BD **antes** de que terminen las demás (un fallo posterior conserva las ya generadas). **(R4)**
- Un recurso que falla tras 2 reintentos queda `error` con un `error_id`; los demás recursos siguen generándose y el job termina `done` si ≥1 quedó listo, o `error` si ninguno. **(R6)**
- `GET /api/ova/jobs/{job_id}` devuelve estado y recursos sin necesidad de la conexión que inició el job. **(R5, R9)**
- `POST .../resume` regenera **solo** las fases `pending`/`error` y deja intactas las `done`. **(R7)**
- Los endpoints exigen autenticación y rate-limit; las respuestas de error **no** contienen `str(e)` ni tokens, solo `status` + `error_id`. **(R8, C4)**
- Ningún archivo nuevo supera 200 líneas y se respeta router → service → model. **(C3, C7)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Persistencia del estado de generación de OVA (EN-013)

  Scenario: La generación continúa aunque el cliente se desconecte
    Given un usuario autenticado inicia la generación de un OVA con 5 fases
    And el servidor crea un job "running" con 5 recursos "pending"
    When el cliente cierra la pestaña a mitad de la generación
    And vuelve a consultar el estado del job más tarde
    Then el job refleja las fases completadas durante la desconexión
    And ninguna fase ya "done" se regeneró

  Scenario: Un recurso falla sin abortar el resto
    Given un job de generación en curso con 5 recursos
    When la fase 3 falla tras 2 reintentos
    Then la fase 3 queda en estado "error" con un error_id
    And las fases 1, 2, 4 y 5 continúan y quedan "done"
    And el contenido de las fases "done" queda persistido en la base de datos

  Scenario: Reanudar continúa solo las fases pendientes
    Given un job en estado "interrupted" con 3 fases "done" y 2 "pending"
    When el usuario solicita continuar el job
    Then solo se regeneran las 2 fases "pending"
    And las 3 fases "done" permanecen sin cambios

  Scenario: El estado no filtra detalles sensibles
    Given un recurso que falló por un error interno del proveedor LLM
    When el cliente consulta el estado del job
    Then la respuesta incluye status y error_id
    But no incluye el mensaje de excepción interno ni tokens/credenciales
```

## Notas de implementación (no normativas)

- El hilo background sigue el patrón ya usado en `regen_service.py`, pero **lee/escribe estado en DB** en vez de un dict in-memory.
- Al arrancar el backend, los jobs en `running` sin progreso reciente pueden marcarse `interrupted` (barrido perezoso en la primera consulta), evitando un worker persistente.
- `_ova_to_dict` (`backend/ova/helpers.py`) podrá enlazar el job en curso; la exposición de `version` en metadata es de HU-030, no de aquí.
