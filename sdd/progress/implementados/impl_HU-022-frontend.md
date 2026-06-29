# Implementación HU-022 — Fase frontend (F1-F4)

Feature: HU-022 — Recuperación de recursos parciales. Solo frontend.
Backend (B1-B4) ya implementado y aprobado; NO se tocó. NO se declara la HU `done`.

## Resumen por sub-tarea

### F1 — Service jobs (`frontend/src/services/ovaCreationService.js`)
- `startJob({prompt, llm, uploadIds, resources})` → `POST /api/ova/jobs` (envía `resources`,
  no `phases`).  `ovaCreationService.js:6-13`
- `getJobStatus(jobId)` → `GET /api/ova/jobs/{id}`.  `:16-18`
- `getResourceContent(jobId, resourceId)` → `GET .../resources/{rid}/content` (B3).  `:21-26`
- `resumeJob(jobId, resourceIds?)` → `POST .../resume`; sin ids → body `{}` (todos los
  pending/error); con ids → `{resource_ids}`.  `:29-36`
- Reusa `apiJson`/`apiFetch` de `lib/http.js`. Todo el fetch del flujo jobs vive aquí (R9).
- Limpieza: se eliminaron del módulo las funciones muertas del loop cliente-side viejo
  (`generateEngageResource`/`generateExploreResource`/`saveOva`) — duplicadas/sin uso.
  `downloadOvaScorm` se conserva (export SCORM, fuera de esta HU).

### F2 — Orquestación (hooks)
- **NUEVO `frontend/src/hooks/useOvaJob.js`** (165 líneas): submit + polling + viewmodel + retry.
  - Convierte la selección del modal (ids 1-10 por fase) a `resources:[{phase_type, resource_type}]`
    (`toResourcesPayload`).  `useOvaJob.js:13-21`
  - `start()` → `startJob` → `setTimeout` recursivo de `getJobStatus` cada `VITE_JOB_POLL_MS`
    (default 2000ms) hasta estado terminal.  `:75-95`
  - **Polling sin `setInterval`**: timeout recursivo vía `pollRef` (latest-fn) + `schedule()`; se
    limpia en cleanup/unmount (`useEffect(() => clearTimer, ...)`).  `:35-72`
  - Viewmodel y outcome **memoizados** (`useMemo`) desde `job`+`selections`.  `:117-128`
  - Selección de fallidos depurada (`pruneSelection`) cuando un fallido pasa a `done`.  `:130-133`
  - Acciones: `retryOne(id)`→`resumeJob(jobId,[id])`, `retrySelected()`→`resumeJob(jobId, sel)`,
    `retryAll()`→`resumeJob(jobId,[])`, `selectAllFailed()`, `toggleFailed(id)`. Tras resume,
    re-arranca el polling.  `:135-167`
- **`frontend/src/hooks/useOvaCreation.js`** (68 líneas, antes 197): adelgazado a orquestador
  fino — prompt + selección del modal, compone `useOvaUploads` + `useOvaJob`. Sin fetch, sin
  loop de generación. Conserva la API que consume `CrearOvaPage` (renombrado `status`→`phase`,
  expone `job` = API de `useOvaJob`).
- **NUEVO `frontend/src/hooks/useResourceContent.js`** (33 líneas): carga on-demand del HTML de
  un recurso `done` (B3). State + service (sin fetch en componente, R9). `loading` derivado (sin
  setState síncrono en effect); ignora respuestas stale por `reqRef`.

### F3 — UI parcial (componentes `frontend/src/components/crear/`)
- **NUEVO `lib/ovaJobViewModel.js`** (92 líneas, util puro): mapeo job→viewmodel
  (`running→generando`, `error→X`, `done→check`, `pending→pendiente`), `failedResourceIds`,
  `pruneSelection`, `groupByPhase`, `jobOutcome` (isTerminal/anyDone/totalFail).
- **NUEVO `ResourceList.jsx`** (93 líneas): lista por fase con marca de estado **✔/✖/…/○** (R5),
  mensaje *"Lo sentimos, hubo un error generando el recurso. Error ID: <id>"* en el recurso `error`
  (R3/R4, nunca `str(e)`), **checkbox** por fallido (R7) y botón **"Reintentar"** por recurso (R6).
  Click en recurso `done` → preview.
- **`ProgressPanel.jsx`** (81 líneas, reescrito): barra de progreso (done/total, ámbar si hay
  fallidos), `ResourceList`, cabecera con **"Seleccionar todos los fallidos"** y **"Reintentar
  seleccionados (N)"** (R7).
- **NUEVO `ResourcePreview.jsx`** (37 líneas): preview de un recurso `done` vía `getResourceContent`
  + `HtmlPreview` existente. Los `done` siguen previsualizables aunque otro falle (R1).
- **NUEVO `TotalFailurePanel.jsx`** (30 líneas): fallo total (job `error`, 0 `done`) → error general
  con Error ID + "Reintentar generación", sin OVA vacío (R8).
- **`pages/CrearOvaPage.jsx`** (88 líneas, reescrito): orquesta PromptPanel + ProgressPanel +
  ResourcePreview + TotalFailurePanel. Selección de preview **derivada en render** (sin effect):
  pick fijado por el usuario mientras siga `done`, si no el primer `done` (R1).
- Eliminado `crear/ResultsPanel.jsx` (huérfano del flujo viejo; LabsPage usa `labs/ResultsPanel.jsx`,
  archivo distinto, intacto).
- Responsive (R9/RN-005): flex-wrap en cabeceras, `truncate` en etiquetas, checkbox/markers shrink-0,
  paddings `sm:` — escritorio y móvil sin solapamientos.

### F4 — Tests unit (cucumber-js, sin browser/backend)
- Lógica testeable extraída al util puro `lib/ovaJobViewModel.js`.
- `tests/features/ova/HU-022_recursos-parciales.feature` (5 scenarios) +
  `tests/steps/unit/ova_partial_unit.steps.js`.
- Registrada en `tests/cucumber.unit.config.mjs` (`paths`).

## Contrato del hook `useOvaJob`
```
{ jobId, job, phase:'idle'|'starting'|'polling'|'terminal', error,
  viewModel: [{ id, phase, phaseLabel, label, emoji,
                status:'pendiente'|'generando'|'check'|'X', error_id, selectable }],
  outcome: { isTerminal, anyDone, totalFail },
  selectedFailedIds,
  start({prompt, llm, uploadIds, selections}), reset(),
  retryOne(id), retrySelected(), retryAll(), toggleFailed(id), selectAllFailed() }
```

## Aplicación de skills
- **frontend-design**: dirección visual consistente con el sistema existente (slate/indigo, bordes
  redondeados, sombras suaves); semáforo de color por estado (emerald=ok, rose=error, indigo=en
  curso, slate=pendiente); jerarquía clara header→lista→preview; mensajes de error legibles con
  Error ID monoespaciado; CTAs diferenciados (rose para reintentos destructivos/recuperación);
  estados de carga ("Cargando vista previa…"); mobile-first con flex-wrap y truncate.
- **vercel-react-best-practices**:
  - `rerender-derived-state-no-effect`: viewmodel/outcome/loading/selección de preview derivados
    en render (`useMemo`/expresiones), no en effects.
  - `rerender-functional-setstate`: `toggleFailed`/poll usan setState funcional → callbacks estables.
  - `advanced-use-latest` / event-handler-refs: `pollRef` guarda la última `poll` para el timer
    recursivo (evita `useCallback` auto-referencial y stale closures).
  - Cleanup de timers en unmount (`clearTimer` en `useEffect`); polling con `setTimeout` recursivo
    (no `setInterval`) → sin solापamiento de requests; guard de respuestas stale por `jobIdRef`/`reqRef`.
  - `pruneSelection` memoizada evita drift de la selección de fallidos.

## Trazabilidad criterio → test/cobertura
- R1 (done previsualizables; viewmodel conserva los done) → `HU-022 "estados backend → UI"`,
  `ResourcePreview` (preview de `done`), `CrearOvaPage` (active = primer `done`).
- R3/R4 (mensaje + Error ID, nunca detalle interno) → `HU-022 "error_id + etiqueta del catálogo"`;
  UI: `ResourceList` solo renderiza `error_id` (el backend nunca manda `str(e)`).
- R5 (marca por estado) → `HU-022 "estados backend → UI son check/X/generando/pendiente"`.
- R6 (reintento individual) → `retryOne`→`resumeJob(jobId,[id])`; backend `test_resume_done_en_subset`.
- R7 (selección múltiple + lote) → `HU-022 "seleccionar todos los fallidos"` +
  `"depurar selección"`; `selectAllFailed`/`retrySelected`.
- R8 (fallo total sin OVA vacío) → `HU-022 "fallo total"` (`jobOutcome.totalFail`); UI
  `TotalFailurePanel`.
- R9 (services→hooks→pages, <200 líneas) → ver tabla de líneas; ESLint max-lines verde.

## Líneas por archivo (C3, <200 no-test)
useOvaCreation 68 · useOvaJob 165 · useResourceContent 33 · ovaJobViewModel 92 ·
ovaCreationService 48 · CrearOvaPage 88 · ProgressPanel 81 · ResourceList 93 ·
ResourcePreview 37 · TotalFailurePanel 30. Todos < 200.

## Verificación (evidencia real)
`./verify.ps1 -Quick`:
- Frontend ESLint (pnpm lint): **PASA** (max-lines 200 incluido).
- Backend ruff check: **PASA** (All checks passed!).
- Frontend unit BDD (pnpm test:unit): **PASA** — **12 scenarios / 49 steps** (7 previos + 5 nuevos HU-022).
- **RESULTADO FINAL: PASA**.
- Sin `console.log`/TODO/FIXME en los archivos nuevos/modificados.

## Notas
- El job corre server-side; el cliente solo hace polling + reintentos. El export SCORM y la
  aparición en "Mis OVAs" los cubre el backend (B2, `job.ova_id`); HU-023 cubrirá reanudar como
  sesión desde "Mis OVAs".
- `resource_type` se envía como id numérico string ("1".."10") del catálogo, consistente con el
  modal y lo que el backend echo-ea en `GET /jobs/{id}`.
