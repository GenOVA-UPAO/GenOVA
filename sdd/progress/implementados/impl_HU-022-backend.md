# Implementación HU-022 — Fase backend (B1-B4)

Feature: HU-022 (extensión de alcance backend aprobada 2026-06-05).
Solo backend. NO se tocó frontend. NO se declara la HU `done`.

## Qué cambió por sub-tarea

### B1 — Plan de recursos real (Gap D)
- `backend/ova/jobs_helpers.py`
  - Nuevo `ResourceRequest{phase_type, resource_type}` (caps de longitud, C4).
  - `StartJobRequest.resources: list[ResourceRequest]` (nuevo) + `phases` (legacy, back-compat).
  - `build_resource_plan` reescrito: 1 fila por recurso elegido; `resource_order` incrementa
    por fase; `phase_order` = engage→1, explore→2. `_legacy_phase_plan` cuando `resources` vacío.
  - `job_params` ahora persiste `resources` además de `phases`/`upload_ids`/`llm` (R9).
- `resource_type` se guarda como el id/nombre que `jobs_runner_exec._resource_type_id` resuelve
  (acepta dígito "1".."10" o nombre de `RECURSOS_META`). Sin desajuste de ids.

### B2 — Materializar OVA parcial (Gap A, R1/R2/R8)
- Nuevo `backend/ova/jobs_materialize.py` (130 líneas):
  - `materialize_partial_ova(db, job, done_resources)` → crea `Ova`(status borrador)/`OvaVersion`/
    `OvaPhase` desde recursos `done`, setea `job.ova_id`, persiste SCORM (reusa
    `ova.router._persist_scorm_zip` + `scorm.service.build_scorm_zip_bytes`), re-ata RAG
    (`rag.store.tie_uploads_to_ova` con `job.params["upload_ids"]`).
  - `_resolve_type` mapea `resource_type` (id/nombre) → `(resource_type_id, title)` vía RECURSOS_META.
  - Fallo contenido (excepción) → `db.rollback()` + log, devuelve None (no rompe el job).
- `backend/ova/jobs_runner.py:_finish_job` llama `_materialize` solo si `any_done and job.ova_id is None`
  (evita OVA duplicado en resume). `_materialize` recarga los `done` ordenados y delega.
- R8: 0 `done` → no se crea OVA, job queda `error` sin `ova_id`.

### B3 — Endpoint de contenido (Gap B, preview R1)
- `backend/ova/jobs_router.py`: `GET /api/ova/jobs/{job_id}/resources/{resource_id}/content`
  (autenticado cookie JWT, solo dueño). 404 opaco (`resource_not_found`) si job/recurso ajeno o
  uuid inválido; 409 (`resource_not_ready`) si el recurso no está `done`/sin contenido.
- `backend/ova/jobs_service.py:get_resource(db, job_id, resource_id)` — lectura (router → service).
- `job_to_dict`/`resource_to_dict` SIN cambios: el estado sigue sin exponer `content` (R8).
  El test del no-filtrado se ajustó para verificar `job_to_dict` (no el endpoint nuevo).

### B4 — Reintento individual/lote (Gap C, R6/R7)
- `backend/ova/jobs_helpers.py:ResumeRequest{resource_ids?}` (caps).
- `backend/ova/jobs_router.py:resume_job` acepta body opcional; `_resolve_resume_targets`
  valida que cada id pertenece al job (`jobs_service.resource_ids_in_job`); id ajeno/inválido → 404 opaco.
  Sin body → `resumable_resource_ids` (todos los pending/error, comportamiento previo).
- Delega a `_launch(job_id, targets)` → `run_job(job_id, only=targets)` (runner ya soporta `only`).

## Migraciones
- Ninguna nueva. `019_ova_generation_jobs.sql` ya define `ova_job_resources.content`
  y el modelo `OvaJobResource.content`. Reutilizado.

## Tests añadidos
`backend/tests/step_defs/test_jobs_steps.py` + `tests/features/setup/EN-013_jobs.feature`:
- B1: `test_plan_recurso_por_fila` — 1 fila por recurso, fase+orden preservados.
- B2: `test_materializa_ova_parcial` — `job.ova_id` set, OvaPhase solo de `done`.
- B2/R8: `test_fallo_total_sin_ova` — job `error`, sin OVA.
- B3: `test_contenido_aparte` — contenido vía `get_resource`; `job_to_dict` sin `content`.
- B4: `test_resume_subconjunto` — subconjunto válido resuelto; `test_resume_ajeno_rechazado` — 404.
- DDL SQLite del test extendido con `ovas`/`ova_versions`/`ova_phases`; `_persist_scorm` stubbeado.

## Trazabilidad criterio → test
- R1 (borrador parcial con recursos generados) → `test_materializa_ova_parcial`, `test_contenido_aparte`.
- R2 (OVA parcial en "Mis OVAs": `job.ova_id` + Ova borrador) → `test_materializa_ova_parcial`.
- R4 (no `str(e)`/tokens al cliente; error_id opaco) → `test_no_filtra_sensibles` (existente, intacto).
- R6/R7 (reintento individual/lote vía resume con subset validado) → `test_resume_subconjunto`,
  `test_resume_ajeno_rechazado`, `test_reanudar_solo_pendientes` (existente).
- R8 (fallo total sin OVA vacío) → `test_fallo_total_sin_ova`.
- B1 contrato (1 fila por recurso) → `test_plan_recurso_por_fila`.

## Contratos para la fase frontend (fase 2)

### POST /api/ova/jobs  (extendido, B1)
```jsonc
// body
{
  "prompt": "string (1..4000)",
  "llm": "string|null (<=120)",
  "upload_ids": ["uuid", ...],            // opcional
  "resources": [                           // NUEVO — plan real
    {"phase_type": "engage", "resource_type": "1"},          // id 1-10 (string) ...
    {"phase_type": "engage", "resource_type": "Micro-Podcast"}, // ... o nombre RECURSOS_META
    {"phase_type": "explore", "resource_type": "5"}
  ]
  // "phases": ["engage","explore"]  // legacy, solo si "resources" vacío
}
// 202 → {"job_id": "uuid", "status": "queued"}
```
Crea 1 `ova_job_resources` por entrada de `resources`. El frontend debe enviar `resources`
(no `phases`) con el `resource_type` que el usuario eligió en el modal (id numérico string o nombre).

### GET /api/ova/jobs/{job_id}/resources/{resource_id}/content  (nuevo, B3)
- 200 → `{"id","phase_type","resource_type","content"}` (HTML del recurso `done`).
- 404 `{"error":"resource_not_found","message":...}` (ajeno / inexistente / uuid inválido).
- 409 `{"error":"resource_not_ready","message":...}` (recurso no `done` o sin contenido).
- Úsalo para el preview del recurso. El estado del job (`GET /jobs/{id}`) NO trae `content`.

### POST /api/ova/jobs/{job_id}/resume  (extendido, B4)
```jsonc
// body opcional
{"resource_ids": ["uuid", ...]}   // reintento individual (1) o lote (N)
// sin body → relanza TODOS los pending/error
// 202 → {"job_id","status":"running","resumed": <n>}
// 200 → {"job_id","status","resumed": 0}  (nada que reanudar)
// 404 → resource_not_found (algún id no pertenece al job o es inválido)
// 409 → job_running (ya en ejecución)
```

## Verificación (evidencia real)
- `backend/tests/step_defs/test_jobs_steps.py`: **13/13 PASA** (`uv run pytest ... -v`).
- `uv run ruff check .`: **All checks passed**.
- `./verify.ps1`: **PASA** — Frontend ESLint, Backend ruff, Frontend unit (7/7).
  Backend BDD: SKIP (servidor :8000 no estaba arriba; los tests de jobs corren in-process
  con SQLite y pasan en aislamiento, según el protocolo cuando el backend no está up).
- Otros `test_*_steps.py` (auth/ova/roles) fallan por `ConnectionError` a :8000 (requieren
  servidor corriendo); pre-existente, ajeno a este cambio.

## Fixes del reviewer (2026-06-05) — CHANGES_REQUESTED resueltos

### Fix 1 — [C4 / seguridad CLAUDE.md] rate-limit en `resume_job`
- `backend/ova/jobs_router.py:137-145`.
  - Antes: `@router.post("/{job_id}/resume")` + `def resume_job(job_id, payload, ...)` — sin rate-limit.
  - Después: añadido `@limiter.limit("10/minute")` y `request: Request` como primer parámetro
    (mismo patrón exacto que `start_job:45-52`). `Request`/`limiter` ya importados.
- Cierra Finding 1 / C4 (endpoint mutante con input externo ahora rate-limited).

### Fix 2 — [R6/R7] un `done` en el subset de `resume` ya no se relanza
- `backend/ova/jobs_runner.py:63-76` (`_select_resources`).
  - Antes: `WHERE status != "done"` solo en la rama sin `only`; con `only` se incluían los `done`.
  - Después: `.where(OvaJobResource.status != "done")` aplica **siempre** (fresh run y subset de resume);
    `only` solo añade el `id.in_(only)`. Relanzar un `done` es inocuo a nivel runner.
- `backend/ova/jobs_service.py:123-132` — nuevo `resumable_subset(db, job_id, requested)`:
  intersecta los ids pedidos con los resumibles (`pending`/`error`), preserva orden, descarta `done`.
- `backend/ova/jobs_router.py:_resolve_resume_targets` — tras validar pertenencia (id ajeno/inválido → 404
  opaco, sin cambio), filtra el subset por `resumable_subset`. Así `len(targets)` (el `resumed` del cliente)
  y el set que va a `run_job(only=...)` contienen **solo** `pending`/`error`.
- Resultado: `{resource_ids:[<id_done>, <id_error>]}` → solo se regenera el `error`; el `done` intacto.

### Comentarios stale corregidos (no bloqueante)
- `test_jobs_steps.py:200` — id 2 ENGAGE es "Storyboard de Video" (no "Infografía Animada"). Corregido.
- `:468` ya decía "Storyboard de Video" — sin cambio.

### Test añadido (cobertura done-en-subset, cierra Finding 2)
- `tests/features/setup/EN-013_jobs.feature` — scenario "Reintentar un subconjunto con un recurso done
  no lo regenera".
- `backend/tests/step_defs/test_jobs_steps.py` — `test_resume_done_en_subset`:
  job `interrupted` con 1 recurso `done` (contenido original) + 1 `error`; resume con subset
  `[done_id, error_id]` → `_resolve_resume_targets` devuelve solo `[error_id]`; el agente se invoca
  exactamente 1 vez (rtype 2); el `error` queda `done` regenerado; el `done` conserva su HTML original.

### Trazabilidad de los fixes → test/criterio
- R6 (solo el recurso pedido, sin tocar `done`) → `test_resume_done_en_subset`.
- R7 (las `done` no se regeneran ni por subset explícito) → `test_resume_done_en_subset`
  (+ `test_reanudar_solo_pendientes` para el path sin body).
- C4 (rate-limit en mutante) → `@limiter.limit("10/minute")` en `resume_job` (paridad con `start_job`).

### Verificación de los fixes (evidencia real)
- `uv run pytest tests/step_defs/test_jobs_steps.py -v`: **14/14 PASA** (1.96s) — 13 previos + `test_resume_done_en_subset`.
- `uv run ruff check .`: **All checks passed!**
- C3 (<200 líneas no-test): `jobs_router.py` 199, `jobs_runner.py` 157, `jobs_service.py` 152.

## Decisiones / gaps pendientes
- En **resume** de un job ya materializado: NO se re-materializa (guard `job.ova_id is None`).
  Si en una pasada futura se quiere que el resume actualice las fases del OVA existente,
  habrá que extender la materialización a "upsert" — fuera de alcance de esta fase.
- `resource_type` acepta id-string o nombre; el frontend (fase 2) debería fijar uno (recomendado:
  id numérico como string) para consistencia con el modal.
- Frontend (F1-F4) sigue pendiente tras gate. NO tocado en esta pasada.
