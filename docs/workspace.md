# Workspace de OVA

> Actualizado 2026-07-15 contra el código real; las rutas React
> (`frontend/src/pages/OvaWorkspacePage.jsx`, `hooks/useOvaWorkspace.js`) y el
> router backend `backend/ova/jobs_router.py` de versiones anteriores de este
> documento ya no existen — el frontend es Angular y el backend reorganizó
> los routers de jobs/edición bajo `generation/` y `ova/`.

Superficie unificada para crear y editar Objetos Virtuales de Aprendizaje
(OVA) con IA generativa y exportación SCORM 1.2. Vive en
`frontend/src/features/ova-workspace/`.

## Modos: creación vs edición

Una sola página decide el modo según la URL:

`frontend/src/features/ova-workspace/pages/ova-workspace-page.component.ts`
lee `route.snapshot.paramMap.get("id")`: si hay `id` renderiza
`<gn-ova-edit-view [ovaId]>`; si no, renderiza `<gn-ova-creation-view>`. Las
dos rutas del router (`frontend/src/app/app.routes.ts`) apuntan al mismo
componente:

```ts
{ path: "crear", loadComponent: () => ... OvaWorkspacePageComponent },
{ path: "workspace/:id", loadComponent: () => ... OvaWorkspacePageComponent },
```

Cuando la creación termina, `OvaCreationViewComponent` emite `onCreated(ovaId)`
y `OvaWorkspacePageComponent.handleCreated` navega a `/workspace/{id}` con
`replaceUrl: true`, así el usuario no puede volver atrás al estado de
creación. El componente es el mismo; solo cambia qué rama del `@if` se
renderiza.

## Componentes frontend principales

| Archivo | Responsabilidad |
|---|---|
| `pages/ova-workspace-page.component.ts` | Decide modo creación/edición según el parámetro `id` de ruta |
| `components/creation/ova-creation-view.component.ts` | Modo creación: formulario, panel de progreso, preview en vivo |
| `components/creation/ova-create-form-card.component.ts` | Prompt, selector de tema, carga de archivos, botón "Generar" |
| `components/creation/progress-panel.component.ts` | Lista de recursos con estado (pendiente/hecho/error), reintento individual y en lote |
| `components/creation/crear-ova-preview-panel.component.ts` | Preview HTML en vivo del recurso fijado durante la generación |
| `components/creation/total-failure-panel.component.ts` | Pantalla cuando todos los recursos fallaron |
| `components/editor/ova-edit-view.component.ts` | Modo edición: layout de dos paneles (chat + workspace) redimensionable |
| `components/editor/workspace-chat-panel.component.ts` | Panel izquierdo: prompt de cambios, selección de fases, adjuntos, barra de progreso de regeneración |
| `components/editor/workspace-ova-panel.component.ts` | Panel derecho: pestañas Preview/Code, historial, ajustes de modelo, descarga SCORM |
| `components/editor/workspace-html-preview.component.ts` | Preview del recurso activo en iframe sandboxed (pestaña Preview) |
| `components/editor/workspace-resource-list.component.ts` | Lista de recursos por fase con drag-and-drop, editar/regenerar/eliminar/añadir (pestaña Code) |
| `components/editor/workspace-phase-item.component.ts` | Item individual: edición inline de contenido o prompt de regeneración por recurso |
| `components/modals/phase-select-modal.component.ts` | Selección de tipos de recurso por fase al crear (con configuración por recurso) |
| `components/modals/add-resource-modal.component.ts` | Añadir un recurso nuevo a una fase existente (máx. 4 por tipo) |
| `components/versioning/version-history-panel.component.ts` | Historial de versiones del OVA completo, diff y revert |
| `components/versioning/phase-version-history.component.ts` | Historial de micro-versiones de una fase individual |
| `services/ova-creation-flow.service.ts` | Orquesta el formulario de creación (prompt, selección, tema) |
| `services/ova-job.service.ts` | Estado del job de creación: arranque, sincronización SSE/polling, reintentos, cancelación |
| `services/ova-job-sync.ts` | `OvaJobSyncRunner` — conecta SSE (`fetchEventSource`) al stream de progreso, con fallback a polling |
| `services/ova-creation.service.ts` | HTTP: `POST /api/ova/jobs` |
| `services/ova-workspace.service.ts` | Estado del modo edición: carga del OVA, regeneración, descarga SCORM |
| `services/ova-edit.service.ts` | HTTP de edición: fases, versiones, regeneración, export SCORM |
| `services/version-history.service.ts` | Envoltorio de `OvaEditService` para diff/revert de versiones y micro-versiones |
| `frontend/src/core/services/ova-jobs-api.service.ts` | HTTP de jobs compartido (creación y "Mis OVAs"): status, resume, cancel |

## Flujo de generación (creación)

```
Usuario escribe el prompt en gn-ova-create-form-card
  → abre gn-phase-select-modal, elige tipos de recurso por fase (+ config opcional)
  → clic en "Generar"
  → OvaJobService.start() → OvaCreationService.startJob()
      → POST /api/ova/jobs  { prompt, upload_ids, resources, theme, resource_configs }
      → 202 { job_id, status: "queued" }
  → OvaJobSyncRunner conecta a GET /api/ova/jobs/{job_id}/stream (SSE)
      evento "progress" → actualiza el snapshot del job
      evento "done"     → detiene el stream
  → gn-progress-panel muestra cada recurso con su estado en tiempo real
  → gn-crear-ova-preview-panel muestra el HTML del recurso fijado
  → al llegar a terminal con al menos un recurso listo:
      OvaCreationViewComponent emite onCreated(ovaId)
      → router.navigate(["/workspace", ovaId], { replaceUrl: true })
```

Backend: `POST /api/ova/jobs` (`generation/jobs/jobs_router.py`) crea el
`OvaJob` + sus filas `OvaJobResource` y lanza la generación — vía `arq` si
`REDIS_URL` está configurado, o inline en un hilo daemon si no. El progreso lo
sigue exponiendo el SSE de `generation/jobs/jobs_stream.py`. Ver
[prometheus.md](prometheus.md) para el motor que corre detrás.

Si algún recurso falla, el usuario puede reintentarlo individualmente
(`retryOne`), varios en lote (`retrySelected`) o todos los pendientes/error
(`retryAll`) — los tres llaman a `POST /api/ova/jobs/{job_id}/resume`.

## Edición de un OVA existente

Al entrar a `/workspace/{id}`, `OvaEditViewComponent.ngOnInit` llama a
`OvaWorkspaceService.init(ovaId)`, que hace `GET /api/ovas/{id}/editar`
(`backend/ova/crud/edit_view_router.py`). Si el OVA sigue `generando`, el
backend responde 409 y el servicio reintenta cada 3s hasta que esté listo.

El layout de edición son dos paneles (`gn-workspace-chat-panel` +
`gn-workspace-ova-panel`) separados por un divisor redimensionable
(`workspace-resizable-divider.component.ts`, con el ratio guardado en
`localStorage`); en mobile se convierten en pestañas "Chat"/"Preview".

**Chat de cambios**: el usuario escribe un prompt de cambio en
`gn-workspace-chat-panel` y lo envía (`Ctrl+Enter` o botón). Esto llama a
`OvaWorkspaceService.submitPrompt()`, que dispara `POST
/api/ovas/{id}/regenerar` (`generation/regen/regen_router.py`) con
`{ prompt, fase_ids }`. El backend marca el OVA `generando`, lanza un hilo
daemon (`_finalize_edit`) y el frontend hace polling cada 3s a `GET
/api/ovas/{id}/regenerar/{job_id}/progress` hasta `success`/`error`. El
componente de chat admite un `selectionMode` con checkboxes de fase para
acotar el prompt a un subconjunto — la vista de edición actual siempre lo
pasa como `false` (regeneración de todo el OVA); la infraestructura para
selección granular vive en el propio componente pero no está enganchada en
`ova-edit-view.component.html`.

**Selección y edición por recurso (pestaña Code)**: `gn-workspace-resource-list`
agrupa las fases por tipo y permite, por cada `gn-workspace-phase-item`:
editar el contenido inline, regenerar con un prompt propio, eliminar, ver el
historial de micro-versiones y arrastrar para reordenar dentro de la misma
fase; `gn-add-resource-modal` añade un recurso nuevo (máximo 4 por tipo de
fase). Estos componentes emiten sus eventos hacia arriba
(`workspace-ova-panel.component.ts` los reexpone como `onEditPhase`,
`onRegenPhase`, `onDeletePhase`, `onAddPhase`, `onReorder`) y
`ova-edit-view.component.html` los conecta a los métodos de mutación de
`OvaWorkspaceService` (`savePhase`, `deletePhase`, `addPhase`,
`reorderPhases`; la regeneración por recurso reusa `runRegen` con
`fase_ids`), que tras cada operación notifican con un toast y recargan el
OVA, igual que la reversión de versiones. Existe además un endpoint de edición granular a nivel de
sub-elemento HTML dentro de un recurso
(`backend/ova/crud/subelement_router.py`, HU-031) que hoy responde `501 Not
Implemented` para todos los tipos de fase — es un stub pendiente de
implementación, no una función activa.

## Versionado

Dos niveles de versión, con endpoints y componentes separados:

- **Versión de OVA completo** (`OvaVersion`): cada `PATCH`/`DELETE` de fase o
  regeneración crea una versión nueva. `gn-version-history-panel` lista todas
  las versiones (`GET /api/ovas/{id}/versiones`), permite diff entre dos
  (`GET /api/ovas/{id}/versiones/diff?v1=...&v2=...`) y revertir
  (`POST /api/ovas/{id}/versiones/{versionId}/revert`).
- **Micro-versión de fase** (`OvaPhaseVersion`, HU-028/HU-029): cada vez que
  se guarda o regenera una fase individual se registra una micro-versión
  (`record_phase_micro_version`, `backend/ova/phases/phase_version_router.py`).
  `gn-phase-version-history` lista (`GET
  /api/ovas/{id}/fases/{faseId}/versiones`) y revierte (`POST
  .../versiones/{mvId}/revert`) sin crear una versión completa nueva.

## Endpoints backend involucrados

### Jobs de creación (`generation/jobs/`)

| Método | Ruta | Archivo |
|---|---|---|
| `POST` | `/api/ova/jobs` | `jobs_router.py` — crea el job y lo lanza |
| `GET` | `/api/ova/jobs/{job_id}` | `jobs_router.py` — snapshot para polling |
| `GET` | `/api/ova/jobs/{job_id}/stream` | `jobs_stream.py` — SSE de progreso |
| `GET` | `/api/ova/jobs/{job_id}/resources/{resource_id}/content` | `jobs_router.py` — HTML de un recurso `done` |
| `POST` | `/api/ova/jobs/{job_id}/resume` | `jobs_router.py` — reintenta recursos pendientes/error |
| `POST` | `/api/ova/jobs/{job_id}/cancel` | `jobs_router.py` — cancela un job en curso |
| `GET` | `/api/ova/jobs?ova_id=...` | `jobs_router.py` — último job de un OVA |

### Edición y versionado (`ova/crud/`, `ova/phases/`)

| Método | Ruta | Archivo |
|---|---|---|
| `GET` | `/api/ovas/{id}/editar` | `edit_view_router.py` — datos completos de edición |
| `PATCH` | `/api/ovas/{id}/fases/{faseId}` | `edit_router.py` — guarda contenido, crea versión + micro-versión |
| `DELETE` | `/api/ovas/{id}/fases/{faseId}` | `edit_router.py` — elimina una fase (bloquea si es la única) |
| `PATCH` | `/api/ovas/{id}/fases/reorder` | `edit_router.py` — reordena dentro de una misma fase |
| `POST` | `/api/ovas/{id}/fases` | `add_phase_router.py` — añade un recurso (máx. 4 por tipo) |
| `GET` | `/api/ovas/{id}/fases/{faseId}/versiones` | `phase_version_router.py` — micro-versiones de una fase |
| `POST` | `/api/ovas/{id}/fases/{faseId}/versiones/{mvId}/revert` | `phase_version_router.py` |
| `PATCH` | `/api/ovas/{id}/fases/{faseId}/subelementos/{subId}` | `subelement_router.py` — edición granular (501, no implementado) |
| `GET` | `/api/ovas/{id}/versiones` | `edit_view_router.py` |
| `POST` | `/api/ovas/{id}/versiones/{versionId}/revert` | `edit_view_router.py` |
| `GET` | `/api/ovas/{id}/versiones/diff` | `edit_view_router.py` |
| `GET` | `/api/ovas/{id}/export-scorm` | `export_router.py` (incluido en `edit_view_router`) |

### Regeneración (`generation/regen/`)

| Método | Ruta | Archivo |
|---|---|---|
| `POST` | `/api/ovas/{id}/regenerar` | `regen_router.py` — inicia regeneración completa o por fases |
| `GET` | `/api/ovas/{id}/regenerar/{job_id}/progress` | `regen_router.py` — progreso estimado (`min(99, elapsed/(fases*60s)*100)`) |

## Ver también

- [prometheus.md](prometheus.md) — motor work-pool que ejecuta los jobs de creación y regeneración
- [fases-5e.md](fases-5e.md) — catálogo de recursos por fase 5E
- [api.md](api.md) — referencia REST completa
