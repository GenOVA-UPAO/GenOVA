# Migration Parity Integration — 3 Parallel Agents

**Fecha:** 2026-07-01  
**Alcance:** Integrar agentes P0 architecture, P0 workspace/jobs, P1 settings/modals en un build verde.

## Agentes integrados

| Agente | ID | Entregable | Estado |
|--------|-----|------------|--------|
| P0 guards / routes / architecture | `984fc315` | `adminGuard`, redirects legacy, PhasePage en `components/phase/`, LinkRow en core, HTTP → servicios | ✅ Completo |
| P0 workspace / jobs | `3dd619e7` | `GeneratingJobsService`, uploads en edición, version history (OVA + fase) | ✅ Completo |
| P1 settings / modals | `9a17bb97` | resource-config schema, ResourceConfigModal, LlmSettingsModal, catálogo modelos, OvaFiveEViewer | ✅ Completo en disco |

## Qué estaba roto

1. **`connect-provider-modal.component.html` missing** — Agent 3 creó `connect-provider-modal.component.ts` antes que el template HTML. Agent 2 falló en build porque el `.html` aún no existía en disco. El archivo ya está presente (untracked) con UI completa de selección de proveedor.
2. **`model-catalog-row.component.ts` TS4111** — Angular strict exige notación de corchetes para propiedades de `Record<string, …>` (`MODALITY_META["text"]`, no `.text`). Acceso dinámico en template (`typeLabels[model.category]`) movido a getter `categoryLabel` en la clase para evitar errores de template typecheck.

## Qué se arregló en integración

- Confirmado `connect-provider-modal.component.html` presente y referenciado por `ConnectProviderModalComponent`.
- Refactor menor en `model-catalog-row.component.ts`: getter `categoryLabel` para acceso indexado fuera del template inline.
- Sin marcadores de merge conflict (`<<<<<<`) en `routes`, `ova-edit-view`, `mis-ovas`, `models-page`, settings.
- Tres scopes coexisten sin solapamiento destructivo:
  - Agent 1: rutas/guards/redirects, phase-page location, link-row core
  - Agent 2: generating-jobs, uploads edit, versioning panels
  - Agent 3: settings store, modales LLM/resource, models-page catalog tab

## Verificación

| Comando | Resultado |
|---------|-----------|
| `pnpm lint` (frontend/) | ✅ PASS (23 infos, 8 warnings preexistentes) |
| `pnpm typecheck` (frontend/) | ✅ PASS |
| `pnpm build` (frontend/) | ✅ PASS (budget warning preexistente: 1.09 MB > 500 kB) |
| `./verify.ps1 -Quick` (repo root) | ✅ PASS (lint, ruff, deps parity, unit BDD) |

## P1 items aún incompletos (deferidos, no bloquean build)

Documentados en `impl_p1-settings-modals.md`:

- ~~**PhaseSelectModal → ResourceConfigModal**~~ — ✅ cableado (gear → modal; persist PUT al confirmar)
- **gn-tabs** — stubs de layout; tab switching no totalmente interactivo
- **Pricing tooltip** en ManageModelRow — badge texto sin hover popover
- **RESOURCE_ICONS** — no portado; preview panel usa emoji fallback

## Orphan component wiring (2026-07-01)

| Componente | Usado en |
|------------|----------|
| `ResourceConfigModalComponent` | `PhaseSelectModalComponent`, `PhasePageComponent` (engage/explore/…) |
| `ResourcePreviewPanelComponent` | `PhaseSelectModalComponent`, `PhasePageComponent` |
| `OvaFiveEViewerComponent` | `PhasePageComponent` sidebar (vía `EngagePageComponent` y resto de fases) |
| `resource-config.helpers.ts` | merge/get config key compartido entre phase-select y phase-page |
| `OvaCreationFlowService` | carga GET configs al abrir modal; PUT al confirmar |

## Audit completion checklist (2026-07-01)

| Item | Estado |
|------|--------|
| ModelAssignmentPanel + MediaTaskCard + fallback chains | ✅ `/models` tasks tab |
| CatalogStatusAlert retry UI | ✅ en panel |
| AdminPlatformPageComponent consolidado | ✅ eliminado; redirect existente |
| StudentDashboardPageComponent | ✅ eliminado; `/dashboard` = ova-library |
| PlatformCapabilitiesCard en models-page | ✅ tab tasks (admin) |

## P0 blockers documentados (fuera de este sprint)

- **ProfileService.saveTheme** vs **ThemeSettingsService** — deduplicar en P2

## Archivos clave por agente (untracked + modified)

### Agent 1 (modified)
- `app.routes.ts`, `admin.routes.ts`, `auth.guard.ts`
- `core/components/cards/link-row.component.ts`
- `ova-workspace/components/phase/phase-page.component.ts`

### Agent 2 (untracked + modified)
- `generating-jobs.service.ts`, `mis-ovas-page.{ts,html,helpers.ts}`
- `ova-edit-view.component.{ts,html}`, `upload-chip-view-model.ts`
- `components/versioning/*`, `version-history.service.ts`

### Agent 3 (untracked)
- `core/settings/components/*` (catalog, connect-provider, manage-models, llm-settings-form)
- `core/settings/services/user-llm-settings.store.ts`
- `features/ova-library/lib/resource-config/*`
- `resource-config-modal.component.{ts,html}`
- `ova-five-e-viewer.*`, `models-page.component.html`

## Conclusión

Build verde. Paridad React→Angular ~**85–90%** en flujos core. Sin commits en esta integración (working tree con cambios unstaged/untracked de los 3 agentes).
