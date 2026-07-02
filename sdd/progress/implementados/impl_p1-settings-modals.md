# P1 — Settings / Modals / Models parity (audit 6d3d3322)

## Scope
Angular parity for resource config schema, ResourceConfigModal, LlmSettingsModal, model catalog components, and OvaFiveEViewer. Routes and adminGuard untouched.

## Files created

### resource-config schema (`features/ova-library/lib/resource-config/`)
- `helpers.ts`, `engage.ts`, `explore.ts`, `explain.ts`, `elaborate.ts`, `evaluate.ts`, `index.ts`
- Plain TypeScript (React legacy did not use zod here)

### Services
- `features/ova-library/services/resource-configs.service.ts` — GET/PUT `/api/users/me/resource-configs` + localStorage cache
- `core/settings/services/user-llm-settings.store.ts` — catalog/settings state (replaces React `useLlmSettings`)

### Lib
- `core/settings/lib/llm-catalog.utils.ts`
- `core/settings/lib/llm-settings-labels.ts`
- `core/settings/lib/llm-settings-mutations.ts`
- `core/settings/lib/user-llm-settings.types.ts`

### Components
- `features/ova-library/components/modals/resource-config-modal.component.{ts,html}`
- `features/ova-workspace/components/modals/llm-settings-modal.component.{ts,html}`
- `core/settings/components/llm-settings-form.component.{ts,html}`
- `core/settings/components/model-catalog-filter-row.component.ts`
- `core/settings/components/model-catalog-row.component.ts`
- `core/settings/components/model-catalog-browser.component.{ts,html}`
- `core/settings/components/connect-provider-modal.{helpers.ts,component.ts,html}`
- `core/settings/components/manage-model-row.component.ts`
- `core/settings/components/manage-models-toolbar.component.ts`
- `core/settings/components/manage-models-modal.component.{ts,html}`
- `features/ova-library/components/viewer/ova-five-e-viewer.{helpers.ts,component.ts,html}`

### Components (audit 2026-07-01)
- `core/settings/components/model-assignment-panel.component.{ts,html}`
- `core/settings/components/model-task-card.component.{ts,html}`
- `core/settings/components/model-task-card-chips.component.ts`
- `core/settings/components/media-task-card.component.{ts,html}`
- `core/settings/components/user-override-section.component.{ts,html}`
- `core/settings/components/catalog-status-alert.component.ts`
- `core/settings/lib/task-meta.ts`, `model-task-card.helpers.ts`, `media-task-card.helpers.ts`
- `features/ova-workspace/services/ova-settings.service.ts`

## Files changed
- `core/settings/services/user-llm-settings.service.ts` — extended with catalog params, refresh, enabled-models
- `features/ova-workspace/pages/models-page.component.{ts,html}` — catalog tab, user LLM form, manage-models modal

## Fully ported
- `resourceConfigSchema` (all 7 legacy files → modular `resource-config/`)
- `ResourceConfigModal` UI + schema-driven sliders
- `resourceConfigsService` → `ResourceConfigsService`
- `LlmSettingsModal` + `LlmSettingsForm` wired to `UserLlmSettingsStore`
- `ModelCatalogBrowser`, `ConnectProviderModal`, `ManageModelsModal` (+ row/toolbar/filter helpers)
- `OvaFiveEViewer` with phase tabs and section renderers

## Deferred / notes
- **PhaseSelectModal** integration with `ResourceConfigModal` — modal ready; phase-select still stub-level (no config gear wiring)
- **gn-tabs** remain layout stubs (pre-existing); tab switching not fully interactive
- **Pricing tooltip** on ManageModelRow simplified to text badge (no hover popover)
- **RESOURCE_ICONS** map not ported; modal uses resource emoji fallback

## Audit completion (2026-07-01)

- [x] **ModelAssignmentPanel** — task cards, fallback chains, MediaTaskCard; wired en `/models` tasks tab
- [x] **CatalogStatusAlert** — retry UI con `store.retryRefresh()` en panel
- [x] **AdminPlatformPageComponent** — eliminado; redirect `/admin/platform` → `/models`; capabilities en tab tasks
- [x] **StudentDashboardPageComponent** — eliminado; React usa ova-library `/dashboard` (sin ruta student)
- [ ] **PhaseSelectModal → ResourceConfigModal** — pendiente
- [ ] **gn-tabs** interactivos — pendiente
- [ ] **ProfileService.saveTheme vs ThemeSettingsService** — deduplicar P2

## Verification
- `pnpm lint` — PASS (pre-existing infos/warnings only)
- `pnpm build` — PASS (budget warning pre-existing)
- `pnpm typecheck` — PASS
