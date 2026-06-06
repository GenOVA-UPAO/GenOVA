# Sesión actual

> Este archivo se vacía al cerrar cada sesión y su contenido se mueve a `history.md`.
> Mantenlo actualizado en tiempo real mientras trabajas, no al final.

## Feature activa: HU-022 — Recuperación de recursos parciales tras error de generación

- **Estado**: `in_progress` (gate humano superado 2026-06-05).
- **Spec**: `sdd/specs/HU-022_recuperar-recursos-parciales.md`.
- **Depende de**: EN-013 (jobs, `done`), EN-012 (error_id, `done`).

### Decisión de arquitectura (aprobada por humano)
- **Enfoque**: migrar la página de creación al flujo **jobs** de EN-013.
  El `error_id` opaco y el `resume` solo viven en jobs; el flujo cliente-side
  actual (`useOvaCreation.js` + `/api/agents/{engage,explore}/generate`) NO emite
  `error_id` ni soporta resume → no cumple R3/R4/R6/R7 sin migrar.
- Backend EN-013 ya disponible:
  - `POST /api/ova/jobs` (202 `{job_id, status:queued}`, hilo background).
  - `GET /api/ova/jobs/{job_id}` (estado job + recursos con `status`+`error_id`).
  - `GET /api/ova/jobs?ova_id=` (localiza job por OVA — HU-023).
  - `POST /api/ova/jobs/{job_id}/resume` (relanza solo pending/error).
- Solapa parcialmente con HU-023 (background + reanudar desde "Mis OVAs"); HU-022
  se limita a: borrador parcial visible, mensaje Error ID en el recurso, marca "X",
  reintento single + múltiple vía `resume`, fallo total sin OVA vacío.

### Plan
1. [en curso] `explorer` — mapa pre-implementación del pipeline de creación frontend
   + contratos jobs + componentes de fase/recurso + riesgos + score.
2. [ ] implementer — migración + UI parcial (services → hooks → pages, <200 líneas).
3. [ ] reviewer — contra spec + CHECKPOINTS.
4. [ ] verify.ps1 verde → ofrecer doc_author.

### Notas / hallazgos
- `frontend/src/hooks/useOvaCreation.js:140` — hoy omite en silencio el recurso fallido.
- `backend/agents/engage_router.py:171` — `500` genérico sin `error_id` (flujo viejo).

### Explorer (complejidad 5/5) — gaps backend de EN-013 (marcado `done` pero es esqueleto)
- **Gap A (R1/R2)**: `jobs_runner._finish_job` NO crea `Ova`/`OvaPhase` ni setea `job.ova_id`
  → borrador parcial no aparece en "Mis OVAs". Materialización vive en `router.py:72-127`
  (`save_ova`) + `tie_uploads_to_ova` (RAG). Sub-tarea B2 (nuevo `jobs_materialize.py`).
- **Gap B (preview R1)**: `resource_to_dict` (`jobs_helpers.py:61-72`) omite `content`;
  `test_jobs_steps.py:363` lo fija. Falta endpoint `GET /jobs/{id}/resources/{rid}/content`.
  Sub-tarea B3.
- **Gap C (R6/R7)**: `resume` relanza TODOS los pending/error; runner ya acepta `only`
  (`jobs_runner.run_job(job_id, only)`). Falta que router/helpers acepten `resource_ids[]`.
  Sub-tarea B4 (barata).
- **Gap D (riesgo alto)**: `POST /jobs` toma `phases: list[str]` y crea 1 recurso genérico
  por fase con `resource_type=None`. El modal elige N recursos por id 1-10. Cambiar contrato
  a `resources:[{phase_type, resource_type}]` + `build_resource_plan` (`jobs_helpers.py:16,28-49`).
  Sub-tarea B1.
- `useOvaCreation.js` en 197/200 líneas → extraer `useOvaJob.js` (obligatorio).
- Riesgo RAG: si el job materializa el OVA, replicar `tie_uploads_to_ova` o expiran chunks.
- Polling: `apiFetch` aborta a 15s; crear helper de polling en service/hook.

### Gate humano resuelto (2026-06-05)
- **Scope backend**: B1-B4 se **absorben en HU-022** (no se reabre EN-013). HU-022 extiende
  el contrato de `POST /api/ova/jobs`. Anotado en la spec.
- **Ejecución**: **backend primero, por fases** → implementer B1-B4 → reviewer → verify →
  ⏸ gate → frontend F1-F4 → reviewer → verify.

### Plan de sub-tareas (backend, fase 1)
- **B1** — plan de recursos real (Gap D): `StartJobRequest`/`build_resource_plan`
  (`jobs_helpers.py`) aceptan `resources:[{phase_type, resource_type}]`, 1 fila por recurso.
- **B2** — materializar OVA parcial (Gap A, R1/R2): nuevo `jobs_materialize.py`; al `_finish_job`
  con `any_done` crea `Ova`/`OvaVersion`/`OvaPhase` desde recursos `done`, setea `job.ova_id`,
  `tie_uploads_to_ova`. Fallo total → sin OVA (R8). Referencia `router.py:save_ova`.
- **B3** — endpoint contenido (Gap B, preview): `GET /api/ova/jobs/{job_id}/resources/{rid}/content`
  (solo dueño). Ajustar `test_jobs_steps.py:356-365` (el no-filtrado aplica a `job_to_dict`, no al endpoint nuevo).
- **B4** — reintento individual/lote (Gap C, R6/R7): `resume` acepta `resource_ids[]` opcional,
  valida pertenencia, delega a `_launch(job_id, ids)`.
- BDD backend en `backend/tests/step_defs/test_jobs_steps.py` + feature `tests/features/setup/EN-013_jobs.feature`.

### Backend fase 1 — IMPLEMENTADO (2026-06-05)
- **B1** hecho: `jobs_helpers.py` — `ResourceRequest` + `StartJobRequest.resources`
  + `build_resource_plan` crea 1 fila por recurso elegido (`phase_order` engage=1/explore=2,
  `resource_order` por fase). Back-compat `phases` cuando `resources` vacío.
- **B2** hecho: nuevo `backend/ova/jobs_materialize.py` (`materialize_partial_ova`); llamado
  desde `jobs_runner._finish_job` cuando `any_done and job.ova_id is None`. Fallo total → sin OVA (R8).
  Reusa `_persist_scorm_zip` (router) + `tie_uploads_to_ova`. SCORM stubbeado en tests.
- **B3** hecho: `GET /api/ova/jobs/{job_id}/resources/{resource_id}/content` (solo dueño, 404 opaco,
  409 si no-`done`). Lógica de lectura en `jobs_service.get_resource`. `job_to_dict` sigue sin `content`.
- **B4** hecho: `resume` acepta `ResumeRequest{resource_ids?}`; `_resolve_resume_targets` valida
  pertenencia (404 opaco si id ajeno/inválido). Sin body → todos los pending/error. Runner ya acepta `only`.
- Migración: NO necesaria — `019_ova_generation_jobs.sql` ya tiene `ova_job_resources.content`.
- Tests: `backend/tests/step_defs/test_jobs_steps.py` 13/13 PASA (7 previos + 6 nuevos B1-B4) +
  feature `EN-013_jobs.feature`. `verify.ps1` PASA (lint+ruff+unit; backend BDD SKIP por :8000 offline).
- ⏸ Pendiente: reviewer backend → luego gate → frontend F1-F4.

### Frontend (fase 2, tras gate)
F1 service jobs · F2 `useOvaJob.js` (extraer, submit+polling+viewmodel) · F3 UI parcial
(ProgressPanel/ResourceList: X, Error ID, checkbox, Reintentar + botones globales en CrearOvaPage) ·
F4 tests unit (mapeo job→viewmodel, selección fallidos) en `cucumber.unit.config.mjs`.
Las fases frontend deben usar las skills `frontend-design` + `vercel-react-best-practices`.

---

## Modo BATCH de implementación (aprobado 2026-06-05)

- Se actualizó el agente para permitir **implementación en lote**: `leader.md` Caso I,
  `AGENTS.md` regla 1, `CLAUDE.md`. Puerta humana **única al inicio**; cada feature igual
  pasa `implementer → reviewer → verify`; para solo ante rojo no-reparable o decisión.
- También se añadió **MODO BATCH a `spec_author`** (≥4 specs: una ronda de asunciones +
  una confirmación + generación continua). [no usado aún]
- **Skills frontend instaladas** (Safe·0 alerts·Low Risk), en `skills-catalog.json`:
  `frontend-design` (anthropics) + `vercel-react-best-practices` (vercel-labs). Las usa el
  `implementer` en tareas frontend. Memoria: `genova-frontend-skills`.

### Lote aprobado: EP-3 spec_ready (orden topológico por deps)
`HU-022(en curso) → HU-023 → HU-024 → HU-025` **⏸ reevaluar aquí** → (luego) HU-026, HU-028,
HU-027, HU-029, HU-030, HU-033, HU-031, HU-032, RN-005.
- **Alcance de este arranque**: hasta **HU-025**, luego parar y reportar.
- **Commits**: uno por feature (conventional) + `merge_commit` en `feature_list.json`.

### Estado HU-022 (feature 1/lote)
- Backend B1-B4: implementado, 13/13 BDD verdes. **Reviewer backend: CHANGES_REQUESTED**
  (`review_HU-022-backend.md`) → 2 fixes bloqueantes.
- Frontend F1-F4: PENDIENTE (usar skills frontend).

### Fixes del reviewer RESUELTOS (backend) — 2026-06-05
- **Fix 1 (C4/seguridad)** hecho: `jobs_router.resume_job` ahora tiene `@limiter.limit("10/minute")`
  + `request: Request` (paridad con `start_job`).
- **Fix 2 (R6/R7)** hecho: `_select_resources` excluye `done` SIEMPRE (también con `only`);
  nuevo `jobs_service.resumable_subset` filtra el subset a `pending`/`error`; `_resolve_resume_targets`
  lo aplica tras validar pertenencia (id ajeno → 404). Un `done` en el subset es inocuo.
- Test nuevo: `test_resume_done_en_subset` (done intacto, solo el error se regenera). Comentario
  stale `test_jobs_steps.py:200` corregido.
- Verificación: **pytest 14/14 PASA**, **ruff OK**, C3 OK (router 199 líneas). Detalle en `impl_HU-022-backend.md`.

### Frontend F1-F4 — IMPLEMENTADO (2026-06-05)
- **F1** service jobs: `startJob`/`getJobStatus`/`getResourceContent`/`resumeJob` en
  `ovaCreationService.js` (R9). Funciones muertas del loop viejo eliminadas.
- **F2** `useOvaJob.js` (NUEVO, 165 líneas): submit + polling (`setTimeout` recursivo, cleanup
  en unmount) + viewmodel memoizado + retry single/lote/all. `useOvaCreation.js` adelgazado a
  68 líneas (antes 197). `useResourceContent.js` (NUEVO) para preview on-demand (B3).
- **F3** UI: `lib/ovaJobViewModel.js` (util puro), `ResourceList`/`ProgressPanel` (✔✖…○ + Error ID +
  checkbox + Reintentar + botones globales), `ResourcePreview` (done previsualizable, R1),
  `TotalFailurePanel` (R8). `CrearOvaPage` reescrito (preview derivado en render). `ResultsPanel`
  huérfano eliminado.
- **F4** tests unit: `tests/features/ova/HU-022_recursos-parciales.feature` (5 scenarios) +
  `tests/steps/unit/ova_partial_unit.steps.js`, registrados en `cucumber.unit.config.mjs`.
- Skills aplicadas: `frontend-design` (semáforo de estado, mensajes Error ID, CTAs, responsive) +
  `vercel-react-best-practices` (derived-state-no-effect, functional setState, latest-fn ref para
  polling, cleanup de timers, memoización).
- Verificación: **`./verify.ps1 -Quick` PASA** — ESLint (max-lines 200) OK, ruff OK,
  unit BDD 12/12 (7 previos + 5 HU-022). Detalle en `impl_HU-022-frontend.md`.
- ⏸ Pendiente: reviewer frontend (contra spec + CHECKPOINTS).
