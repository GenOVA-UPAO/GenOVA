# impl_p0-workspace-jobs

**Fecha:** 2026-07-01  
**Alcance:** Jobs en biblioteca, uploads en edición, historial de versiones (OVA + fase)

## Entregado

### 1. GeneratingJobsService (React `useGeneratingJobs`)

- `frontend/src/features/ova-library/services/generating-jobs.service.ts`
- `frontend/src/features/ova-library/lib/job-types.ts`
- Poll cada 4s por OVA con `status === 'generando'`; para en estados terminales (`done`, `error`, `interrupted`)
- 404 → job huérfano, sin reintento
- `resume(ovaId)` → `OvaCreationService.resumeJob` + reinicio de poll
- `mis-ovas-page`: `effect` sincroniza lista; `[job]="jobFor(ova.id)"`; `resumeJob` implementado

### 2. Uploads en OvaEditView

- `OvaUploadsService` conectado (mismo flujo que creación)
- `buildUploadsPropBag` / `buildUploadsProps` en `upload-chip-view-model.ts` (DRY con `ova-creation-view`)
- Handlers `(onFilesSelected)` / `(onRemoveFile)` en ambos chat panels

### 3. VersionHistoryPanel

- `components/versioning/version-history-panel.component.{ts,html}`
- `services/version-history.service.ts` — diff, revert OVA (delega a `OvaEditService`)
- `lib/ova-versioning.ts`, `lib/version-history.types.ts`
- Descomentado y cableado en `ova-edit-view.component.html`

### 4. PhaseVersionHistory

- `components/versioning/phase-version-history.component.{ts,html}`
- Cableado en `workspace-phase-item.component.ts`
- `(onPhaseReverted)="ws.load()"` en `ova-edit-view` vía `workspace-ova-panel`

## Verificación

| Comando | Resultado |
|---------|-----------|
| `pnpm lint` | ✅ OK (warnings preexistentes) |
| `pnpm typecheck` | ✅ OK |
| `pnpm build` | ❌ Falla por errores **preexistentes** fuera de alcance: `connect-provider-modal.component.html` missing, `model-catalog-row.component.ts` TS4111 |

## Paridad React

| React | Angular | Notas |
|-------|---------|-------|
| `useGeneratingJobs` | `GeneratingJobsService` | Misma lógica poll/resume; signals en lugar de TanStack Query |
| `OvaCard job={}` | `[job]="jobFor(id)"` | Progress badge + resume/continue |
| `VersionHistoryPanel` | `VersionHistoryPanelComponent` | Diff + revert; PrimeNG dialog |
| `PhaseVersionHistory` | `PhaseVersionHistoryComponent` | Micro-versiones por fase |
| `uploadsProps` en `OvaEditView` | `OvaUploadsService` + `buildUploadsPropBag` | API solo en services |

## Fuera de alcance (respetado)

- `app.routes.ts`, admin guards, phase-page location, link-row move
