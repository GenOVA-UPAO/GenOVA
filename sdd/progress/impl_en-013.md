# EN-013 — Persistencia del estado de generación (jobs) — Implementación

**Feature:** EN-013 — Persistencia del estado de generación (jobs).
**Alcance:** BACKEND solamente. No se tocó `frontend/src/` (el switch del cliente
es HU-023). Spec sin `## Mockup ASCII` → sin wireframe gate (C8 N/A).

## Archivos creados

| Archivo | Líneas | Rol |
|---|---|---|
| `backend/migrations/019_ova_generation_jobs.sql` | 44 | Tablas `ova_jobs` + `ova_job_resources` (idempotente, índice `(job_id, phase_order, resource_order)`) |
| `backend/ova/jobs_model.py` | 78 | ORM `OvaJob` / `OvaJobResource` (módulo aparte → C3) |
| `backend/ova/jobs_service.py` | 121 | Crear job+recursos, consultar, resume, barrido perezoso `interrupted` |
| `backend/ova/jobs_runner.py` | 139 | Hilo background: Session propia, orquesta recursos, persistencia incremental, error_id |
| `backend/ova/jobs_runner_exec.py` | 81 | Generación por recurso: reintentos (máx 2 extra) + timeout, llama a `regen_agents` |
| `backend/ova/jobs_helpers.py` | 87 | Pydantic `StartJobRequest` (max_length), plan de recursos, serialización segura |
| `backend/ova/jobs_router.py` | 134 | HTTP: POST (rate-limit) / GET {id} / GET ?ova_id / POST resume |
| `tests/features/setup/EN-013_jobs.feature` | — | 7 escenarios Gherkin |
| `backend/tests/step_defs/test_jobs_steps.py` | — | Steps pytest-bdd (SQLite in-memory + LLM mockeado) |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `backend/models.py` | Re-export `OvaJob, OvaJobResource` (registra tablas en `Base.metadata`) |
| `backend/main.py` | Import + `include_router(ova_jobs_router, prefix="/api/ova/jobs")` |

Todos los archivos backend < 200 líneas (C3). Patrón router → service/runner → model (C7).

## Decisiones de diseño (sin desviarse del spec)

- **Recurso = elemento generable dentro de una fase** (no la fase entera): una fila
  `ova_job_resources` por recurso, con `phase_type/phase_order/resource_type/resource_order`.
- **Persistencia incremental (R4):** `ova_job_resources.content` (TEXT) guarda el HTML del
  recurso apenas se completa; `ova_phase_id` queda nullable. NO se toca `/save` ni el
  pipeline de producción — la materialización del OVA es de HU-023 (fuera de alcance).
- **Session propia del runner:** `run_job` crea `SessionLocal()` (NO reusa la del request),
  igual que `regen_service._finalize_edit`. El router lanza un `threading.Thread(daemon=True)`.
- **Reintentos + timeout (R6):** `MAX_ATTEMPTS=3` (1 + 2 reintentos), cada intento acotado a
  `LLM_TIMEOUT_S` vía `ThreadPoolExecutor.result(timeout=...)`. Al agotar → `error` +
  `error_id` (UUID) registrado con `error_log_service.log_generation_error` (EN-012).
- **Un fallo no aborta el resto (R6):** `_process_resource` captura, registra y continúa; el
  job termina `done` si ≥1 recurso quedó listo, `error` si ninguno.
- **Barrido perezoso (R7):** en cada GET, un job `running` con `updated_at` más viejo que
  `STALE_AFTER_SECONDS` (180 s) pasa a `interrupted` (sin worker persistente).
- **Seguridad (R8, C4):** auth con `get_current_user`; ownership por `user_id`; POST con
  `@limiter.limit("10/minute")` + `request: Request`; Pydantic `Field(max_length=…)`;
  `commit_or_500()` en todas las escrituras; la serialización (`job_to_dict`/`resource_to_dict`)
  expone solo `status` + `error_id` — nunca `content`, `str(e)`, tokens ni credenciales.

## Cómo se probó el runner (mock del LLM)

Tests a nivel service/runner con **SQLite in-memory** (StaticPool, una sola DB compartida
entre la sesión del runner y la del test → simula "cliente desconectado, server sigue").
El agente LLM se **monkeypatchea**: `jobs_runner_exec.regen_agents.regenerate_phase_content`
se sustituye por una función de prueba que devuelve HTML o lanza excepción. `jobs_runner.SessionLocal`
se apunta a la `sessionmaker` del engine de test. El runner se invoca **síncrono** (`run_job`)
para estado determinista. Los nombres de `resource_type` usan los reales de
`agents.engage_prompts.RECURSOS_META` para que la resolución fase→id sea idéntica a producción.

## Mapa de trazabilidad R → test (C5)

| Regla | Test (pytest-bdd) | Qué verifica |
|---|---|---|
| **R1** crea `ova_jobs` (status, user_id, ova_id) | `test_continua_tras_desconexion`, `test_solo_dueno` | `create_job` persiste el job con estado y dueño |
| **R2** progreso por recurso (`ova_job_resources`) | `test_continua_tras_desconexion`, `test_recurso_falla_sin_abortar` | una fila por recurso con `status/attempts/error_id` |
| **R3** orquestación en servidor (hilo background) | `test_continua_tras_desconexion` | el runner ejecuta sin la conexión del cliente y avanza el estado |
| **R4** persistencia incremental | `test_continua_tras_desconexion`, `test_recurso_falla_sin_abortar` | `content` de cada recurso `done` queda en BD aunque otro falle después |
| **R5** consultable por polling sin la conexión inicial | `test_continua_tras_desconexion`, `test_no_filtra_sensibles` | `get_job`/`list_resources` devuelven el estado tras la "desconexión" |
| **R6** ≤2 reintentos + timeout, fallo aislado | `test_reintentos`, `test_recurso_falla_sin_abortar` | `attempts == MAX_ATTEMPTS`, recurso `error` con `error_id`, los demás `done`, job `done` |
| **R7** resume solo `pending`/`error`; `interrupted` | `test_reanudar_solo_pendientes`, `test_barrido_interrupted` | `resumable_resource_ids` excluye `done`; job `running` obsoleto → `interrupted` |
| **R8** auth + opaque id + sin `str(e)`/tokens | `test_solo_dueno`, `test_no_filtra_sensibles` | otro usuario no obtiene el job; payload sin content/mensaje interno/credenciales |
| **R9** job ligado a OVA y usuario (lookup) | `test_solo_dueno` (+ `find_job_by_ova` por `ova_id`/`user_id`) | filtrado por `user_id`; `find_job_by_ova` localiza por OVA del usuario |

## Criterios de aceptación → cobertura

- Inicio crea job + filas por recurso → R1/R2 (`test_continua_tras_desconexion`).
- Desconexión no detiene la generación; progreso refleja lo hecho → R3/R5 (idem).
- Cada recurso `done` persistido antes de que terminen los demás → R4 (`test_recurso_falla_sin_abortar`).
- Recurso falla tras 2 reintentos → `error` + `error_id`, los demás siguen, job `done` → R6 (idem + `test_reintentos`).
- GET devuelve estado sin la conexión inicial → R5/R9 (`test_no_filtra_sensibles`).
- Resume regenera solo `pending`/`error` → R7 (`test_reanudar_solo_pendientes`).
- Endpoints con auth+rate-limit; errores sin `str(e)`/tokens → R8/C4 (`test_no_filtra_sensibles`, `test_solo_dueno`).
- Ningún archivo > 200 líneas; router→service→model → C3/C7.

## Verificación

- `./verify.ps1` → **PASA** (ESLint, ruff `All checks passed!`, frontend unit BDD 7/7).
  Backend BDD SKIP (:8000 offline) — los 7 tests EN-013 corren standalone y pasan (1.4 s).
- `uv run pytest tests/step_defs/test_jobs_steps.py test_error_log_steps.py` → 11 passed
  (no rompe EN-012). Los fallos de auth/ova/roles del suite completo son pre-existentes
  (requieren backend en :8000), ajenos a esta feature.
- `import main` carga limpio; rutas montadas: `POST/GET /api/ova/jobs`,
  `GET/POST /api/ova/jobs/{job_id}`, `POST /api/ova/jobs/{job_id}/resume`.

## Notas / fuera de alcance

- No se wirea ningún cliente del flujo de jobs (HU-023). El endpoint POST está listo para que
  HU-023 lo consuma; hoy el frontend sigue usando el flujo síncrono `/save`.
- La materialización del OVA (`ova_phase_id`, crear `OvaVersion`/`OvaPhase` desde el job) se
  hace en HU-023; aquí el contenido vive en `ova_job_resources.content` (R4 satisfecho).
- EN-013 **NO** marcada `done` — lo valida el reviewer.
