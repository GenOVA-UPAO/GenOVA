# P0 — Angular Architecture / Routing / Cleanup

## Scope
Screaming architecture cleanup: guards, legacy redirects, page→page import elimination, HTTP out of components, shared UI consolidation.

## Files created
- `frontend/src/features/auth/services/auth.guard.ts` — added `adminGuard`
- `frontend/src/features/ova-workspace/components/phase/phase-page.component.ts` — moved from `pages/`
- `frontend/src/features/ova-library/services/phase-select.service.ts` — phase resource fetch for modal
- `frontend/src/core/components/cards/link-row.component.ts` — shared link row UI
- `frontend/src/core/settings/services/theme-settings.service.ts` — theme PATCH without profile cross-import

## Files changed
- `frontend/src/features/admin/admin.routes.ts` — `adminGuard` on all routes; `/admin/platform` → `/models`
- `frontend/src/app/app.routes.ts` — legacy redirects (`modelos`, `fallback`, `ova/:id/workspace`, `metodologia/*`)
- `frontend/src/features/student/pages/explore-page.component.ts` — import phase from `components/phase/`
- `frontend/src/features/student/pages/engage-page.component.ts` — import phase from `components/phase/`
- `frontend/src/features/student/pages/dashboard-page.component.ts` — renamed to `StudentDashboardPageComponent` / `gn-student-dashboard-page`
- `frontend/src/features/profile/pages/user-links-page.component.ts` — LinkRow from core
- `frontend/src/features/ova-library/components/modals/phase-select-modal.component.ts` — uses `PhaseSelectService`
- `frontend/src/features/ova-library/components/modals/theme-modal.component.ts` — uses `ThemeSettingsService`

## Files deleted
- `frontend/src/features/ova-workspace/pages/phase-page.component.ts`
- `frontend/src/features/ova-workspace/pages/fallback-page.component.ts` (stub; replaced by redirect)
- `frontend/src/features/ova-library/components/cards/link-row.component.ts`

## Behavior
| Item | Result |
|------|--------|
| `adminGuard` | `role === 'administrador'` → allow; else redirect `/dashboard` |
| Admin routes | All protected with `[authGuard, adminGuard]` |
| Phase page | Lives under `ova-workspace/components/phase/`; student pages import component, not page |
| Phase select modal | HTTP via `PhaseSelectService.fetchAllPhaseResources()` |
| LinkRow | Shared at `core/components/cards/` |
| Dashboard selector collision | Student dashboard renamed; ova-library keeps `gn-dashboard-page` |
| `/fallback` | Redirects to `/models` (matches React) |
| Legacy URLs | `modelos`, `crear-ova`, `ova/:id/workspace`, `metodologia/explore`, `metodologia/engage/:id` |

## Build / lint / typecheck
- `pnpm lint` (frontend): **PASS** (pre-existing infos/warnings only)
- `pnpm build` (frontend): **PASS** (bundle budget warning pre-existing)
- `pnpm typecheck` (frontend): **PASS**

## Blockers for other agents
- **Student dashboard** (`StudentDashboardPageComponent`) has no route — intentionally kept renamed, not wired. Wire route if product needs separate student home.
- **`ProfileService.saveTheme`** still exists (used by profile page if any); theme modal now uses `ThemeSettingsService`. Consider deduplicating later.
- **`ova_workspace/`** (underscore) folder was already absent on disk; no delete needed.
- **`ova_library/`** duplicate link-row was already absent; no delete needed.
- Out of scope (untouched): `ova-edit-view`, mis-ovas job polling, `resourceConfigSchema`, `LlmSettingsModal` internals.
