# EN-009: Integración Frontend ↔ Backend de Agentes

> Metadata (de `sdd/backlog.md`):

| Campo | Valor |
|---|---|
| ID | EN-009 |
| Tipo | Habilitador |
| Épica/Tema | EP7: Despliegue e Infraestructura Cloud |
| Sprint | Sprint 2 |
| Status | done |
| Prioridad | Alta |
| Estimación | 13 SP |
| Dependencia | EN-003 |
| Responsable | — |
| Fase | Prometheus - Architectural Design |
| Fecha creación | 2026-06-08 |
| Fecha actualización | 2026-06-10 |
| Fecha Fin (info) | 2026-06-14 |

## Objetivo

Conectar la interfaz web (Sprint 1) con el backend de agentes (Sprint 2), reemplazando los mocks del frontend con llamadas reales al orquestador EN-003 para un producto end-to-end funcional.

## Contexto

Implementado en Sprint 2. La capa de comunicación es `frontend/src/lib/http.js` con la función `apiFetch()`: usa `credentials: 'include'` para enviar la cookie `genova_token`, timeout de 15 000 ms y base URL desde `VITE_API_URL`. El frontend no lee tokens directamente (httpOnly cookie). Los hooks `useOvaJob` y `useOvaCreation` gestionan el lifecycle del job (polling cada 3 s mientras el estado sea `pending`/`processing`).

## Alcance

### Incluye
- `frontend/src/lib/http.js`: `apiFetch()` con cookies, timeout y manejo de errores HTTP.
- **Endpoints de jobs (generación)**:
  - `POST /api/ova/jobs` — crear job de generación.
  - `GET /api/ova/jobs/{id}` — estado del job + recursos generados.
  - `GET /api/ova/jobs/{id}/resources/{rid}/content` — contenido HTML de un recurso.
  - `POST /api/ova/jobs/{id}/resume` — reanudar job pausado.
- **Endpoints de agentes (labs/fase individual)**:
  - `POST /api/agents/engage` — generar recurso fase Engage.
  - `POST /api/agents/explore` — generar recurso fase Explore.
- Polling: hook `useOvaJob` consulta cada 3 s mientras estado ≠ `done|error`.
- Estados del job: `pending` → `processing` → `done` | `error`.

### No incluye
- Endpoints de edición de OVA (→ HU-025 → HU-033): se listan en `api/ova.py` pero no son el foco de EN-009.
- WebSocket (polling es suficiente para el alcance actual).
- Swagger/OpenAPI generado automáticamente (FastAPI lo provee en `/docs`).

## Dependencias

- **EN-003** — orquestador Prometheus procesa los jobs de generación.
- **EN-006** — URL de producción del backend definida.
- Consumido por **HU-002** (crear OVA), **HU-003** (visualizar 5E), **HU-023** (background + reanudación).

## Reglas de negocio

1. **R1** — `apiFetch()` siempre incluye `credentials: 'include'`; la cookie `genova_token` viaja automáticamente.
2. **R2** — `apiFetch()` aplica timeout de 15 000 ms; las peticiones LLM pueden tardar más, pero el poll siguiente recupera el estado.
3. **R3** — Base URL leída de `VITE_API_URL`; en dev apunta a `http://localhost:8000`.
4. **R4** — `POST /api/ova/jobs` requiere `{ topic, level, lang }` mínimo; retorna `{ job_id, status }`.
5. **R5** — `GET /api/ova/jobs/{id}` retorna job con lista de recursos y su estado individual (`pending|generating|done|error`).
6. **R6** — Polling se detiene cuando `job.status === 'done'` o `'error'`.
7. **R7** — Errores HTTP 4xx/5xx son manejados por `apiFetch()`; nunca se expone `str(e)` al cliente (C4).
8. **R8** — `VITE_API_URL` es la única variable `VITE_*` de conexión; nunca contiene secrets.

## Criterios de aceptación

- `apiFetch()` incluye `credentials: 'include'` en todas las peticiones. **(R1)**
- `POST /api/ova/jobs` retorna `job_id` y `status: "pending"` al enviarse el prompt. **(R4)**
- El hook `useOvaJob` consulta `GET /api/ova/jobs/{id}` cada 3 s hasta `done|error`. **(R5, R6)**
- Cuando el job falla, el frontend muestra el estado `error` sin stack interno. **(R7)**
- `VITE_API_URL` no contiene API keys ni secrets. **(R8)**
- Flujo completo funciona contra producción: prompt → job procesado → OVA visible en 5E. **(R4, R5)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Integración Frontend ↔ Backend de Agentes (EN-009)

  Scenario: Crear job de generación desde el frontend
    Given un usuario autenticado con cookie genova_token válida
    When envía POST /api/ova/jobs con topic "Machine Learning" y level "básico"
    Then el backend retorna job_id y status "pending"
    And el frontend inicia polling cada 3 segundos

  Scenario: Polling hasta job completado
    Given un job en estado "processing"
    When el hook useOvaJob consulta GET /api/ova/jobs/{id}
    Then si status es "done", el polling se detiene
    And los recursos del OVA se renderizan en la vista 5E

  Scenario: Manejo de error en job
    Given un job que falla durante la generación
    When el frontend recibe status "error" en el polling
    Then se muestra el estado de error al usuario
    And no se expone ningún mensaje interno o stack trace

  Scenario: Timeout en apiFetch no rompe la sesión
    Given una petición que demora más de 15 segundos
    When apiFetch aplica el timeout
    Then se lanza un error manejado en el hook
    And el siguiente ciclo de polling recupera el estado real del job
```
