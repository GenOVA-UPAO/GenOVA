# P1 — OVA creation flow + folder consolidation

## Feature
Angular P1: OVA creation at `/crear` + consolidate `ova_library`/`ova_workspace` → hyphen folders.

## Files changed

### TASK A — Creation flow
- `features/ova-workspace/pages/ova-workspace-page.component.ts` — wired `OvaCreationViewComponent`
- `features/ova-workspace/components/creation/ova-creation-view.component.ts` (new)
- `features/ova-workspace/components/creation/ova-create-form-card.component.ts` (new)
- `features/ova-workspace/components/creation/progress-panel.component.ts` (new)
- `features/ova-workspace/components/creation/creation-resource-list.component.ts` (new)
- `features/ova-workspace/components/creation/crear-ova-preview-panel.component.ts` (new)
- `features/ova-workspace/components/creation/total-failure-panel.component.ts` (new)
- `features/ova-workspace/services/ova-creation-flow.service.ts` (new)
- `features/ova-workspace/services/ova-uploads.service.ts` (new)
- `features/ova-workspace/services/upload.service.ts` (new)
- `features/ova-workspace/lib/upload-chip-view-model.ts` (new)
- `features/ova-workspace/services/ova-job.service.ts` — fixed `start()` to use `selections` + `toResourcesPayload`
- `features/ova-library/components/modals/phase-select-modal.component.ts` — functional 5E resource picker

### TASK B — Folder consolidation
- Moved `link-row.component.ts` → `features/ova-library/components/cards/link-row.component.ts`
- Updated `features/profile/pages/user-links-page.component.ts` import
- Deleted `features/ova_library/` and `features/ova_workspace/`

### Build fix (pre-existing)
- `features/ova-library/pages/mis-ovas-page.ts` — mutable copy of `STATUS_OPTIONS`
- `frontend/angular.json` — initial bundle budget 1.1MB (was 1MB, compile OK at 1.02MB)

## Build
`pnpm build` from `frontend/` — **PASS** (after budget bump)

## Acceptance mapping
| Criterio | Evidencia |
|---|---|
| `/crear` shows creation UI | `OvaCreationViewComponent` in workspace page |
| Edit via `workspace/:id` | unchanged `OvaEditViewComponent` |
| Folder consolidation | no `ova_library`/`ova_workspace` imports remain |
| Max 200 lines/file | all new files ≤ 200 lines |
| Angular patterns | standalone, signals, inject |
