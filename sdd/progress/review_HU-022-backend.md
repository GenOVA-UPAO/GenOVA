# Review — HU-022 (fase backend, B1-B4)

**Veredicto:** CHANGES_REQUESTED

Alcance revisado: solo backend (B1-B4 de la "Extensión de alcance aprobada 2026-06-05").
Frontend F1-F4 NO está en el diff y NO se evalúa. La HU NO se declara `done`.

## Trazabilidad criterios ↔ tests
- R1 (borrador parcial con ≥1 done) → `test_materializa_ova_parcial`, `test_contenido_aparte` — [x]
- R2 (OVA parcial en "Mis OVAs": `job.ova_id` + Ova `borrador`) → `test_materializa_ova_parcial` — [x]
- R4 (no `str(e)`/tokens; error_id opaco) → `test_no_filtra_sensibles` — [x]
- R6 (reintento individual vía resume) → `test_resume_subconjunto`, `test_resume_ajeno_rechazado` — [~] parcial:
  cubre subset válido y rechazo de id ajeno, pero NO cubre el caso "id `done` en el subset" (ver Finding 2).
- R7 (resume solo pending/error, done intactas) → `test_reanudar_solo_pendientes` (vía `resumable_resource_ids`) — [~]
  parcial: el path por `resumable_resource_ids` excluye done, pero el path con `resource_ids` explícito NO (Finding 2).
- R8 (fallo total sin OVA vacío) → `test_fallo_total_sin_ova` — [x]
- B1 contrato (1 fila por recurso) → `test_plan_recurso_por_fila` — [x]

## Lint + ruff
- ruff check (backend completo + archivos del diff): [x] OK — "All checks passed!"
- pnpm lint: no aplica a este diff (sin cambios frontend); `verify.ps1` lo cubre.

## Tests
- `uv run pytest tests/step_defs/test_jobs_steps.py -v`: [x] **13/13 PASA** (3.00s) — corrido en esta revisión.
- Otros `test_*_steps.py` (auth/ova/roles): requieren backend en :8000 (pre-existente, ajeno al diff).

## Auto-fix de tests
- No aplicado: los tests estaban verdes (13/13). Los hallazgos son defectos de comportamiento/seguridad,
  no tests rojos — no procede auto-reparación de tests.

## Checkpoints
- C1 (tests verdes): [x] 13/13 jobs BDD.
- C2 (lint/ruff): [x] ruff OK.
- C3 (<200 líneas no-test): [x] jobs_router 197, jobs_materialize 129, jobs_runner 157,
  jobs_helpers 120, jobs_service 141, jobs_runner_exec 81, jobs_model 78.
- C4 (seguridad): [ ] **FALLA** — endpoint mutante `resume` sin `@limiter.limit` (Finding 1).
  El resto OK: `commit_or_500` en service, Pydantic con `Field(max_length=…)`, sin tokens en respuestas.
- C5 (trazabilidad R→test): [~] R6/R7 con cobertura parcial (falta caso done-en-subset, Finding 2).
- C6 (repo limpio): [x] sin `print()`/TODOs huérfanos; `current.md` refleja estado.
- C7 (router→service→model): [x] router delega a `jobs_service`/`jobs_runner`; sin lógica de negocio en router.

## Checks adicionales
- G (Docs al día): [x] OK — extensión de contrato documentada en spec HU-022 + impl doc; sin cambio de arranque público.
- H (Migración BD): [x] N/A — sin cambio de schema; `019_ova_generation_jobs.sql` ya define `content` (reuso correcto).

## Foco de seguridad (verificado)
- `get_resource_content` (B3): valida dueño vía `get_job(...,user_id)` y luego `get_resource(job.id,rid)`;
  id ajeno/inválido → 404 opaco `resource_not_found`; no-`done`/sin contenido → 409 opaco. Sin fuga. [x]
- `resume` con `resource_ids` (B4): `_resolve_resume_targets` valida pertenencia vía `resource_ids_in_job`;
  id ajeno/inválido → 404 opaco. [x] (pero ver Finding 2 sobre estado `done`).
- `job_to_dict`/`resource_to_dict` SIN `content`/error message → solo `status`+`error_id` (R8). [x]
- `materialize_partial_ova`: fallo contenido (rollback+log), no rompe job; 0 done → sin OVA (R8). [x]
- `_resource_type_id`/`_resolve_type` resuelven id-string o nombre RECURSOS_META → sin recursos
  `resource_type=None` que disparen "unknown resource_type" (el plan B1 siempre pasa un tipo). [x]
- Guard anti doble-materialización en resume: `if any_done and job.ova_id is None` en `_finish_job`. [x]

## Cambios requeridos

1. **[C4 / R8 / CLAUDE.md — seguridad]** `backend/ova/jobs_router.py:137` — `resume_job` es un endpoint
   **mutante con input externo** (`resource_ids`) que lanza generación LLM en background (costoso), pero
   **no tiene `@limiter.limit`**. Regla dura CLAUDE.md: "New endpoints with external input:
   `@limiter.limit("N/minute")` + `request: Request`". Fix: añadir `@limiter.limit("10/minute")` y
   `request: Request` a `resume_job` (como en `start_job:45-48`).

2. **[R6 / R7 — un `done` en el subset de resume se regenera]** `backend/ova/jobs_runner.py:71-72` —
   en `_select_resources`, la rama `only is not None` NO excluye recursos `done`. Combinado con
   `backend/ova/jobs_router.py:174-190` (`_resolve_resume_targets` valida con `resource_ids_in_job`,
   que devuelve TODOS los ids sin filtrar por estado), un `resource_id` ya `done` en el body de `resume`
   **se relanza**: lo pone `running`, re-llama al LLM y sobrescribe el contenido bueno. Viola R7
   ("las `done` no se regeneran") y R6 ("solo ese recurso"). Fix recomendado: en `_select_resources`
   añadir `.where(OvaJobResource.status != "done")` también cuando `only is not None`
   (relanzar un `done` debe ser inocuo); o filtrar el subset por `resumable` en `_resolve_resume_targets`.
   Añadir test: pasar un id `done` en el subset y verificar que no se regenera (X→sigue done, contenido intacto).

## Notas (no bloqueantes, no requieren acción)
- `backend/tests/step_defs/test_jobs_steps.py:200` — comentario stale: dice 'rtype==2 → "Infografía Animada"';
  el id 2 de ENGAGE es "Storyboard de Video" (`_FAILING_NAME`). La lógica del test es correcta; solo el
  comentario está desactualizado. Igual en `:468`.
- Resume de job ya materializado no re-materializa (guard `ova_id is None`); documentado como fuera de
  alcance de esta fase en impl doc. OK.
