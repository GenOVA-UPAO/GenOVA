# P1 — App Layout Shell (Navbar, Sidebar, MainContainer)

## Feature
Replace app-layout placeholders with real shell components ported from React legacy.

## Files created
- `frontend/src/core/layouts/navigation/nav-links.ts`
- `frontend/src/core/layouts/lib/layout-helpers.ts`
- `frontend/src/core/layouts/components/navbar-brand.component.ts`
- `frontend/src/core/layouts/components/navbar.component.ts`
- `frontend/src/core/layouts/components/sidebar.component.ts`
- `frontend/src/core/layouts/components/sidebar-menu.component.ts`
- `frontend/src/core/layouts/components/sidebar-nav-item.component.ts`
- `frontend/src/core/layouts/components/sidebar-section.component.ts`
- `frontend/src/core/layouts/components/sidebar-profile-footer.component.ts`
- `frontend/src/core/layouts/components/nav-icon.component.ts`
- `frontend/src/core/layouts/components/main-container.component.ts`

## Files changed
- `frontend/src/core/layouts/shells/app-layout.ts` — wired gn-navbar, gn-sidebar, gn-main-container; fullBleed preserved
- `frontend/src/features/auth/services/auth.service.ts` — added `permissions`, `theme_settings` to MeUser

## Behavior
- Desktop: fixed sidebar (md+), navbar with brand / Crear OVA / avatar menu
- Mobile: hamburger opens drawer with SidebarMenu; backdrop dismiss
- Permission-gated nav: analytics, models, vinculacion, admin sections
- Trash badge via OvaLibraryService.fetchTrashCount()
- Theme modal from navbar avatar menu
- MainContainer: max-w-6xl padded scroll area (non-fullBleed routes)

## Build / lint
- `pnpm build` (frontend): **PASS** (warning: initial bundle >500kB budget)
- `biome lint src/core/layouts`: **PASS** (1 info: fullBleed bracket access required by TS4111)

## Notes
- Nav routes use Angular paths (`/crear`, `/models`, `/admin`) not legacy React paths
- `/vinculacion` link present but route not yet in app.routes.ts (pre-existing gap)
