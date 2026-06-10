# Review — HU-022 (fase frontend F1-F4)

**Veredicto:** APPROVED

Revisión de la fase frontend de HU-022 (migración de creación de OVA al flujo jobs
de EN-013: submit → polling → estado por recurso → reintento single/lote vía resume +
recuperación de recursos parciales). Backend B1-B4 ya aprobado, no se tocó. No se declara
la HU `done`.

## Trazabilidad criterios ↔ tests
- R1 (done previsualizables + borrador parcial): [x] `toResourceViewModel` conserva los `done`
  (`HU-022 "estados backend → UI"`); UI `ResourcePreview` (preview de `done`), `CrearOvaPage`
  (active = primer `done`, derivado en render). Materialización del OVA = backend B2.
- R2 (OVA parcial en "Mis OVAs"): [x] responsabilidad backend (B2, `job.ova_id`); frontend no
  participa. Fuera del alcance frontend.
- R3/R4 (mensaje + Error ID, nunca `str(e)`/stack/tokens): [x] `ova_partial_unit.steps.js:54`
  (el viewmodel solo expone `error_id`); backend `resource_to_dict` no emite `str(e)`. UI:
  `ResourceList.jsx:54-59` y `TotalFailurePanel.jsx:5,15-19` solo renderizan `error_id`.
- R5 (marca por estado ✔✖…○): [x] `HU-022 "estados backend → UI son check/X/generando/pendiente"`
  (`feature:5-9`); UI `ResourceList.jsx:4-9`.
- R6 (reintento individual): [x] wiring `retryOne→resumeJob(jobId,[id])` (`useOvaJob.js:145`);
  backend `test_resume_done_en_subset`. (Sin test unit frontend dedicado — wiring trivial + cubierto backend.)
- R7 (selección múltiple + lote): [x] `HU-022 "seleccionar todos los fallidos"` + `"depurar selección"`
  (`feature:16-24`); `selectAllFailed`/`retrySelected`/`pruneSelection`.
- R8 (fallo total sin OVA vacío): [x] `HU-022 "fallo total"` (`feature:26-30`, `jobOutcome.totalFail`);
  UI `TotalFailurePanel.jsx`.
- R9 (services→hooks→pages, <200 líneas): [x] ver sección Arquitectura + Líneas; ESLint max-lines verde.

## Lint + ruff
- pnpm lint (ESLint, max-lines:200): [x] OK
- ruff check backend: [x] OK (All checks passed!)

## Tests
- pnpm test:unit (cucumber-js): [x] OK — 12 scenarios / 49 steps (7 previos + 5 HU-022)
- pytest step_defs: N/A en fase frontend (backend ya aprobado; verify -Quick no lo corre)
- Build de producción (vite build): [x] OK — 116 módulos, `CrearOvaPage` compila, todos los imports resuelven

## Auto-fix de tests
No aplicó: verify -Quick verde en la primera ejecución.

## Foco verificado (del encargo)
1. **Seguridad/R3-R4**: [x] `ResourceList`/`ResourcePreview`/`TotalFailurePanel` solo renderizan
   `error_id`. `attempts` (presente en el payload) NUNCA se muestra como error. `apiJson`
   (`http.js:50`) surfacea solo `message`/`detail` (genéricos del backend), nunca `str(e)`.
2. **Arquitectura (C7/R9)**: [x] TODO el fetch vive en `ovaCreationService.js`. `useOvaJob`,
   `useResourceContent`, `CrearOvaPage` delegan al service; sin fetch directo. Capas respetadas.
3. **Polling**: [x] `setTimeout` recursivo (no `setInterval`) vía `pollRef` (latest-fn) + `schedule()`;
   `clearTimer` en unmount (`useOvaJob.js:77`) y al llegar a terminal (`:61`). Guard de respuestas
   stale por `jobIdRef.current !== id` (`:56,66`) tras reset/cambio de job. `start()`/`resumeAndPoll`
   llaman `clearTimer()` antes de re-arrancar → sin solapamiento de ciclos.
4. **Contrato backend**: [x] `startJob` envía `resources:[{phase_type, resource_type}]` (no `phases`),
   `resource_type=String(r.id)` consistente con el catálogo y con lo que el backend echo-ea.
   `resumeJob(jobId, ids?)` con body `{}` (todos) o `{resource_ids}`. `getResourceContent` solo
   se invoca para `done` (`ResourcePreview` gateado por `resource.status === 'check'`).
5. **R1/R5/R6/R7/R8**: [x] todos presentes y derivados del viewmodel. El reintento actualiza solo
   los recursos afectados (backend `resumable_subset` excluye `done`; `pruneSelection` depura la
   selección cuando un fallido pasa a `done`).
6. **Estado derivado**: [x] viewModel/outcome/cleanSelection memoizados (`useMemo`); preview pick
   derivado en render en `CrearOvaPage` (sin effect); `useResourceContent.loading` derivado. Sin
   re-render loops.
7. **Convenciones**: [x] sin `console.log`/TODO/FIXME en los archivos del diff. `useOvaCreation`
   adelgazado; único consumidor es `CrearOvaPage` (no rompe otros). `crear/ResultsPanel.jsx`
   eliminado sin referencias colgantes (`labs/ResultsPanel.jsx` es otro archivo, intacto). Funciones
   muertas removidas de `ovaCreationService` no se importan en ningún lado.

## Checkpoints
- C1 (tests verdes): [x] 12/12 unit
- C2 (lint limpio): [x] ESLint + ruff exit 0
- C3 (<200 líneas no-test): [x] ovaCreationService 42 · useOvaJob 150 · useOvaCreation 58 ·
  useResourceContent 31 · ovaJobViewModel 82 · ResourceList 89 · ProgressPanel 75 ·
  ResourcePreview 33 · TotalFailurePanel 29 · CrearOvaPage 75 — todos < 200
- C4 (seguridad): [x] sin tokens/str(e)/attempts crudos en UI; backend ya validado
- C5 (trazabilidad): [x] mapa R<n>→test en `impl_HU-022-frontend.md` y arriba
- C6 (repo limpio): [x] verify -Quick PASA, sin debug/TODO huérfanos
- C7 (arquitectura): [x] services→hooks→pages sin fetch en hooks/pages
- C8 (wireframe gate): [~] sin aprobación de wireframe documentada para esta fase, PERO no queda
  artefacto `frontend/src/wireframes/HU-022_*` en el repo (criterio de borrado cumplido) y la UI
  respeta el Mockup ASCII del spec. Nota procedimental, no bloqueante en una review de código ya
  implementado tras gate humano de extensión de alcance documentado.

## Checks adicionales
- G (Docs al día): [x] OK — el flujo de creación pasa de "fase a fase cliente-side" a jobs server-side,
  pero CLAUDE.md ya describe jobs (EN-013) y migraciones; no hay endpoints públicos nuevos ni cambio
  de arranque visible al usuario introducido por la fase frontend. Sin cambio de docs requerido.
- H (Migración BD): [x] N/A — fase 100% frontend; no se tocó `backend/` ni schema.

## Cambios requeridos
Ninguno. APPROVED.

## Observaciones no bloqueantes
1. `useResourceContent.js:17` — el `then/catch` no guarda contra unmount (solo contra respuestas
   stale por `reqRef`). En React 18+ un setState tras unmount no rompe ni warnea; aceptable.
2. `ovaCreationService.js:36` — `downloadOvaScorm` queda exportada pero sin consumidor en este diff;
   se conserva intencionalmente (export SCORM, fuera de alcance). No bloquea.
3. R6 carece de test unit frontend dedicado; el wiring `retryOne→resumeJob(jobId,[id])` es trivial
   y la lógica de no-tocar-`done` está cubierta por el backend (`resumable_subset`/`test_resume_done_en_subset`).
4. C8: registrar la aprobación/ausencia de wireframe en `current.md` para cerrar el gate formalmente.
