# Workspace de OVA

> Superficie unificada para crear y editar Objetos Virtuales de Aprendizaje con IA generativa y exportación SCORM 1.2.

## Archivos clave

| Archivo | Rol |
|---|---|
| `frontend/src/pages/OvaWorkspacePage.jsx` | Página raíz — decide modo creación o edición según `ovaId` en la URL |
| `frontend/src/components/workspace/OvaCreationView.jsx` | Modo creación: prompt, recursos, progreso en vivo |
| `frontend/src/components/workspace/OvaEditView.jsx` | Modo edición: chat regen + panel preview/code + toolbar |
| `frontend/src/components/workspace/WorkspaceChatPanel.jsx` | Panel izquierdo: textarea, archivos, selección de recursos |
| `frontend/src/components/workspace/WorkspaceOvaPanel.jsx` | Panel derecho: pestañas Preview/Code, toolbar, SCORM, settings |
| `frontend/src/components/workspace/WorkspaceResourceList.jsx` | Lista drag-and-drop de recursos por fase (Code view) |
| `frontend/src/components/workspace/VersionHistoryPanel.jsx` | Modal de historial de versiones con diff y revert |
| `frontend/src/components/workspace/LlmSettingsModal.jsx` | Configuración rápida de modelos LLM desde el workspace |
| `frontend/src/hooks/useOvaCreation.js` | Orquestador de creación (prompt + uploads + job) |
| `frontend/src/hooks/useOvaJob.js` | Polling del job de creación (EN-013) |
| `frontend/src/hooks/useOvaWorkspace.js` | Hook del workspace de edición (carga, regen, polling, operaciones) |
| `frontend/src/hooks/useOvaUploads.js` | Gestión de archivos temporales (subida, listado, eliminación) |
| `frontend/src/services/ovaCreationService.js` | HTTP de creación: `startJob`, `getJobStatus`, `resumeJob` |
| `frontend/src/services/ovaEditService.js` | HTTP de edición: `fetchOvaEditorData`, `triggerRegen`, `downloadEditedScorm`, etc. |
| `backend/ova/jobs_router.py` | Endpoints de jobs: `POST /api/ova/jobs`, `GET` status, `POST` resume |
| `backend/ova/edit_router.py` | Endpoints de edición: `PATCH` fases, `DELETE` fases, `PATCH` reorder |
| `backend/ova/edit_view_router.py` | Endpoints de vista: `GET /editar`, `GET /export-scorm`, versiones, revert, diff |
| `backend/ova/regen_router.py` | Endpoints de regeneración: `POST /regenerar`, `GET /progress` |
| `backend/scorm/service.py` | Builder SCORM 1.2: `build_scorm_zip_bytes()` |

## Resumen

El workspace es la superficie central de GenOVA donde el usuario crea un OVA desde cero o edita uno existente. Una sola página (`OvaWorkspacePage`) renderiza ambos modos según el parámetro `ovaId` de la URL, manteniendo la misma instancia de React montada durante la transición crear→editar.

El workspace integra: generación server-side con polling en tiempo real, chat de regeneración con selección granular de recursos, preview HTML en iframe, editor de código con drag-and-drop, historial de versiones con diff y revert, exportación SCORM, y configuración de modelos LLM por tarea.

## Cómo funciona

### Flujo de creación

```
Usuario escribe prompt (mín 10 caracteres)
  → Adjunta archivos de apoyo (PDF, DOCX, imágenes, audio)
  → Abre PhaseSelectModal para elegir tipos de recurso (ENGAGE + EXPLORE)
  → Clic en "Generar"
  → useOvaJob.start() → POST /api/ova/jobs → 202 { job_id, status: "queued" }
  → Polling cada VITE_JOB_POLL_MS (2000ms por defecto) vía GET /api/ova/jobs/{id}
  → Panel derecho muestra preview de recursos conforme se completan
  → Al alcanzar estado terminal + al menos un recurso listo:
      navigate(`/ova/${id}/workspace`, { replace: true })
  → OvaWorkspacePage detecta el nuevo ovaId y monta OvaEditView
```

**Componentes del modo creación**:
- **Izquierda** (`CrearOvaChatPanel`): prompt, selector de fases, barra de progreso, lista de recursos con checkmarks/errores, acciones de reintento individual o en lote.
- **Derecha** (`CrearOvaPreviewPanel`): preview HTML en vivo del recurso seleccionado (click en un recurso completado para fijarlo; por defecto muestra el primero disponible).
- En mobile, solo se muestra el panel izquierdo a ancho completo.

**Reintentos**: si algún recurso falla, el usuario puede reintentarlo individualmente (`retryOne`), seleccionar varios fallidos y reintentar en lote (`retrySelected`), o reintentar todos los pendientes/error (`retryAll`). Se llama a `POST /api/ova/jobs/{id}/resume`.

**Restauración de jobs**: si el usuario navega desde "Mis OVAs" con un `resumeJobId` en `location.state`, el hook `useOvaJob.restore()` retoma el polling de ese job existente (HU-023 R4).

### Flujo de edición

```
OvaEditView recibe ovaId → useOvaWorkspace(ovaId) → GET /api/ovas/{id}/editar
  → Si status === "generando" (409): muestra spinner y reintenta cada 3s
  → Si error: muestra mensaje + botón reintentar
  → Si éxito: renderiza split panel con datos completos
```

**Split panel**:
- **Desktop** (≥640px): panel izquierdo (`WorkspaceChatPanel`, ancho configurable ~38% inicial, mínimo 300px) + divisor redimensionable + panel derecho (`WorkspaceOvaPanel`).
- **Mobile**: pestañas "Chat" / "Preview" (tabs de shadcn/ui).

**Panel izquierdo — WorkspaceChatPanel**:
- Textarea de prompt con placeholder contextual (si hay selección activa, indica cuántos recursos abarca).
- Adjuntar archivos (mismo hook `useOvaUploads`, máximo archivos configurable vía `VITE_UPLOAD_MAX_FILES`, default 5).
- Botón "Regenerar OVA completo" — dispara `regenAll()` con el prompt original del OVA (sin `faseIds`).
- Botón "Seleccionar recursos" — activa modo de selección con checkboxes por fase; el prompt aplica solo a los recursos marcados.
- Barra de progreso de regeneración (porcentaje + etapa) cuando `isRegenerating === true`.
- Envío con `Ctrl+Enter` o botón "Aplicar".

**Panel derecho — WorkspaceOvaPanel**:
- **Preview**: `WorkspaceHtmlPreview` renderiza el HTML de cada recurso en un iframe sandboxed.
- **Code**: `WorkspaceResourceList` agrupado por `phase_type` con drag-and-drop (solo intra-fase), edición inline, regeneración individual, eliminación y botón "Añadir recurso" (máximo 4 por tipo de fase).

### Transición crear → editar

`OvaWorkspacePage` usa `useParams().ovaId` como interruptor:

- **Sin `ovaId`** (`/crear-ova`): renderiza `<OvaCreationView onCreated={handleCreated} />`.
- **Con `ovaId`** (`/ova/:id/workspace`): renderiza `<OvaEditView ovaId={ovaId} />`.

Cuando la creación termina exitosamente, `OvaCreationView` llama `onCreated(ovaId)`, que ejecuta `navigate(/ova/${id}/workspace, { replace: true })`. React Router re-renderiza el mismo componente `OvaWorkspacePage` (misma instancia), que ahora detecta `ovaId` y muestra `OvaEditView`. El `replace: true` evita que el usuario pueda volver atrás al estado de creación.

Si el OVA aún está terminando de generarse en el backend (`status === "generando"`), `useOvaWorkspace` recibe HTTP 409 del endpoint `GET /editar` y muestra un spinner con reintentos automáticos cada 3s hasta que el backend reporte `"listo"`.

## Toolbar del panel derecho

La barra superior de `WorkspaceOvaPanel` contiene los siguientes controles, de izquierda a derecha:

| Control | Componente | Funcionalidad |
|---|---|---|
| **Toggle Preview/Code** | `Button` group | Alterna entre vista previa HTML (iframe) y lista de recursos editable |
| **Version badge** | `Badge` | Muestra `v{version_number}` de la versión activa |
| **Historial** | `Button` | Abre `VersionHistoryPanel` (modal con lista de versiones, diff lado a lado y revert con confirmación) |
| **⚙ Gear** | `GearButton` | Abre `LlmSettingsModal` (configuración rápida de modelos sin salir del workspace) |
| **⤓ SCORM** | `Button` | Descarga el zip SCORM. Deshabilitado a menos que `ova.status === "listo"` |

### VersionHistoryPanel

Modal accesible desde el botón "Historial". Muestra todas las versiones del OVA ordenadas por número descendente. Cada versión muestra:
- Badge con número de versión (la activa se resalta).
- Fecha de creación.
- Botón "Revertir" (excepto en la versión activa) con confirmación `window.confirm()`.
- Checkbox para seleccionar dos versiones y compararlas.

Al seleccionar dos versiones y pulsar "Ver comparación", se llama a `GET /api/ovas/{id}/versiones/diff?v1=...&v2=...` y se muestra el contenido de las fases lado a lado en dos columnas.

Revertir llama a `POST /api/ovas/{id}/versiones/{vId}/revert`, recarga el OVA y cierra el modal.

## Pipeline de regeneración (regen)

El hook `useOvaWorkspace` expone dos vías de regeneración:

### Regeneración completa (`regenAll`)
- Dispara `POST /api/ovas/{id}/regenerar` con `{ prompt: null, fase_ids: [] }`.
- El backend usa el prompt original del OVA y regenera todas las fases.
- Establece `ova.status = "generando"`, lanza un daemon thread con `_finalize_edit()`.

### Regeneración con prompt personalizado (`submitPrompt`)
- El usuario escribe un prompt en el chat y opcionalmente selecciona fases específicas (modo selección).
- Dispara `POST /api/ovas/{id}/regenerar` con `{ prompt: "...", fase_ids: [...] }`.
- Si no se seleccionan fases y `fase_ids` está vacío, el backend regenera todas.

### Polling de progreso
- Tras recibir el `job_id` (202), el frontend inicia polling cada **3000ms** a `GET /api/ovas/{id}/regenerar/{job_id}/progress`.
- El backend calcula el porcentaje estimado (`min(99, elapsed / (n_phases * 60s) * 100)`) y resuelve una etapa descriptiva (`_resolve_regen_stage`).
- La barra de progreso se muestra en `WorkspaceChatPanel` con porcentaje + texto de etapa.
- Al recibir `status: "success"`: toast verde, se recarga el OVA automáticamente.
- Al recibir `status: "error"`: toast rojo, se detiene el polling.

## Sistema de polling

El workspace usa **dos loops de polling independientes**, cada uno con su propio timer ref y limpieza en unmount:

| Loop | Hook | Intervalo | Endpoint | Timer ref |
|---|---|---|---|---|
| Creación | `useOvaJob` | `VITE_JOB_POLL_MS` (2000ms) | `GET /api/ova/jobs/{id}` | `timerRef` |
| Regeneración | `useOvaWorkspace` | 3000ms (fijo) | `GET /api/ovas/{id}/regenerar/{jobId}/progress` | `regenTimerRef` |

Ambos siguen el patrón `pollRef` (ref que apunta a la función de poll más reciente, evita dependencias circulares en `useCallback`):

```
pollRef.current = pollFn        // efecto: mantiene el ref actualizado
timerRef.current = setTimeout(() => pollRef.current?.(), INTERVAL)  // programa siguiente tick
clearTimer() en cleanup         // efecto: limpia el timer al desmontar
```

El loop de creación también usa `jobIdRef` para detectar respuestas stale (si el job fue reseteado mientras una petición estaba en vuelo).

## Exportación SCORM

El botón "⤓ SCORM" en la toolbar solo se habilita cuando `ova.status === "listo"`.

**Flujo**:
1. `downloadEditedScorm(ovaId)` → `apiFetch(/api/ovas/${id}/export-scorm)`.
2. Backend (`edit_view_router.py` → `GET /export-scorm`):
   - Verifica ownership, status `"listo"`, existencia del archivo en disco.
   - Devuelve `FileResponse` con `media_type="application/zip"` y `filename="{titulo}_v{version}.zip"`.
3. Frontend lee el `Content-Disposition` header para obtener el nombre del archivo, crea un blob, genera un `URL.createObjectURL`, dispara un `<a>` click programático y libera la URL.

**Contenido del zip** (generado por `scorm/service.py → build_scorm_zip_bytes()`):

| Archivo en el zip | Descripción |
|---|---|
| `imsmanifest.xml` | Manifiesto SCORM 1.2 — metadatos del curso, organización, recursos |
| `index.html` | SCO shell — iframe + navegación entre recursos |
| `resources/recurso_N.html` | Un archivo HTML por fase (ENGAGE, EXPLORE, etc.), contenido generado por IA |
| `resources/scorm.js` | API SCORM 1.2 (`_scormInit`, `_scormComplete`, `cmi.core.lesson_status`) |
| `resources/styles.css` | Estilos del shell SCORM |
| `resources/app.js` | Lógica de navegación del shell (cambio de recurso, tracking) |

El zip se empaqueta con compresión `ZIP_DEFLATED`.

## Integración con LlmSettingsModal

El botón ⚙ (gear) en la toolbar abre un modal (`LlmSettingsModal`) que permite configurar los modelos LLM y timeouts por tarea sin salir del workspace.

**Implementación**:
- `LlmSettingsModal` recibe props `open` y `onOpenChange`.
- Usa `useLlmSettings(open)` — el parámetro `open` hace que la carga de datos ocurra solo cuando el modal se abre (lazy load).
- Renderiza `LlmSettingsForm` (el mismo componente usado en `/profile`) con dropdowns por tarea filtrados por `enabledModels` y sliders de timeout.
- Al guardar, llama a `PUT /api/users/me/llm-settings`.
- Incluye un enlace a `/profile` para la configuración completa.

## Endpoints de la API

### Creación (jobs)

| Método | Ruta | Propósito | Auth |
|---|---|---|---|
| `POST` | `/api/ova/jobs` | Inicia job de generación. Body: `{ prompt, llm, upload_ids, resources }`. Retorna 202 `{ job_id, status }` | user |
| `GET` | `/api/ova/jobs/{job_id}` | Estado del job + recursos (sin contenido HTML). Usado por el polling de creación | user |
| `GET` | `/api/ova/jobs/{job_id}/resources/{resource_id}/content` | Contenido HTML de un recurso completado (para preview en vivo) | user |
| `POST` | `/api/ova/jobs/{job_id}/resume` | Reintenta recursos pendientes/error. Body opcional: `{ resource_ids: [...] }` | user |
| `GET` | `/api/ova/jobs?ova_id=...` | Busca el último job de un OVA (para restaurar desde "Mis OVAs") | user |

### Edición y workspace

| Método | Ruta | Propósito | Auth |
|---|---|---|---|
| `GET` | `/api/ovas/{id}/editar` | Vista completa de edición: título, status, versión activa con fases, historial de versiones | user |
| `PATCH` | `/api/ovas/{id}/fases/{phaseId}` | Guarda contenido editado de una fase. Crea nueva versión (auto-bump) + micro-versión | user |
| `DELETE` | `/api/ovas/{id}/fases/{phaseId}` | Elimina una fase. Crea nueva versión sin ella. Bloquea si es la única restante | user |
| `POST` | `/api/ovas/{id}/fases` | Añade un nuevo recurso a una fase (`phase_type` + `prompt`). Máximo 4 por tipo | user |
| `PATCH` | `/api/ovas/{id}/fases/reorder` | Reordena recursos dentro de una misma fase. Body: `{ reorders: [{ phase_id, new_order }] }` | user |

### Regeneración

| Método | Ruta | Propósito | Auth |
|---|---|---|---|
| `POST` | `/api/ovas/{id}/regenerar` | Inicia regeneración. Body: `{ prompt, fase_ids }`. Retorna 202 `{ job_id }` | user |
| `GET` | `/api/ovas/{id}/regenerar/{job_id}/progress` | Progreso de regeneración: `{ status, percentage, stage }` | user |

### Versiones y SCORM

| Método | Ruta | Propósito | Auth |
|---|---|---|---|
| `GET` | `/api/ovas/{id}/versiones` | Lista todas las versiones del OVA | user |
| `POST` | `/api/ovas/{id}/versiones/{vId}/revert` | Revierte a una versión anterior (marca `is_active`) | user |
| `GET` | `/api/ovas/{id}/versiones/diff?v1=...&v2=...` | Compara dos versiones (fases + contenido) | user |
| `GET` | `/api/ovas/{id}/export-scorm` | Descarga el zip SCORM de la versión activa. Requiere `status === "listo"` | user |

## Ver también

- [`catalogo-modelos.md`](catalogo-modelos.md) — catálogo unificado de modelos LLM y su integración con el workspace
- [`fases-5e.md`](fases-5e.md) — descripción de las 5 fases 5E y sus 10 tipos de recurso cada una
- [`api.md`](api.md) — referencia REST completa de todos los endpoints de GenOVA
- [`generacion-5e.md`](generacion-5e.md) — pipeline de generación 5E y cadena de fallback LLM

---

_Especificaciones relacionadas: HU-025 (workspace edición), HU-026 (edición granular), HU-027 (selección de recursos), HU-028 (historial de versiones), HU-030 (workspace unificado), HU-032 (añadir recurso), HU-033 (reordenar recursos), EN-013 (jobs server-side)._
