# impl_p2-angular-polish — P2 Angular migration polish

**Fecha:** 2026-07-01  
**Scope:** P2 backlog post P0/P1 (sin cambios de backend funcionales salvo CORS/default URL)

## Completado

### 1. E2E/CI puerto 4200
- `tests/playwright.config.js`, `.github/workflows/ci.yml`, `verify.ps1`, `tests/steps/e2e/auth.steps.js`
- `CLAUDE.md`, `docs/testing.md`, `docs/deployment.md`, `README.md`, `.claude/launch.json`
- `backend/main.py` (CORS +4200, mantiene 5173 legacy), `backend/core/config.py`, `backend/users/admin/helpers.py`

### 2. `/models` — página funcional
- `models-page.component.ts` + `.html`: tabs (asignación admin, API keys usuario, Prometheus/keys globales admin)
- `user-llm-settings.service.ts`, `user-api-keys-card.component.ts`, `user-key-row.component.ts`
- Guard de permisos `ai:models:self|platform` o rol administrador

### 3. Limpieza scaffold
- Eliminado `frontend/src/app/app.html` (no referenciado; `app.ts` usa template inline)
- Eliminado override Biome para `app.html`
- Dirs `ova_library/`, `ova_workspace/` (underscore) ya no existían

### 4. Phosphor icons
- `nav-icon.component.ts` → clases `ph ph-*`
- `@phosphor-icons/web/regular` en `styles.css`
- Iconos Phosphor en header de `/models`

### 5. C7 — apiFetch → services
- `AuthService`: login, register, forgot/reset password, verifyTotp + `AuthMessageData`
- `ProfileService`: `deleteAccount(password)`, `saveTheme`
- `AdminSettingsService`: registration mode
- `StudentDashboardService`, `PhaseGenerationService`, `TotpService`, `UserLlmSettingsService`
- Páginas auth, profile, admin-roles, student dashboard, phase-page, totp-setup-card, theme-modal migradas
- **0** `apiFetch` restantes en `pages/**` y `components/**`

### 6. CHECKPOINTS.md
- C3: exención plantillas `.html`; patrón split Angular
- C7: capas services → signals → pages
- C12: items Angular marcados [x] (excepto animaciones `@angular/animations`)

## Omitido / diferido

| Item | Motivo |
|---|---|
| ModelAssignmentPanel completo (usuario no-admin en tab tasks) | React usa `useLlmSettings` + cards complejas; P2 muestra mensaje informativo + tab API keys; admin usa `PlatformLlmConfigCard` existente |
| `AdminPlatformPageComponent` como ruta separada | Contenido admin integrado en tabs `/models`; componente sigue disponible sin ruta dedicada |
| Bundle size refactor | Sentry ya lazy-load; build advierte budget 500kB (1.08 MB initial) — sin cambio de budgets en P2 |
| `frontend-react-legacy` refs 5173 | Legacy intencional; no tocar |
| `sdd/specs/EN-011` ref 5173 | Spec histórica; no actualizada |

## Verificación

```
frontend/: pnpm lint     → exit 0 (infos/warnings preexistentes)
frontend/: pnpm typecheck → exit 0
frontend/: pnpm build    → exit 0 (warning budget initial 1.08 MB)
repo root: ./verify.ps1 -Quick → PASA (4/4)
```

## Archivos tocados (resumen)

**Nuevos:** `user-llm-settings.service.ts`, `user-key-row.component.ts`, `user-api-keys-card.component.ts`, `models-page.component.html`, `student-dashboard.service.ts`, `phase-generation.service.ts`, `totp.service.ts`, este doc.

**Modificados:** models-page, auth.service + auth pages/components, profile.service/page, admin-settings/roles, student dashboard, phase-page, totp-setup-card, theme-modal, nav-icon, styles.css, biome.json, CHECKPOINTS.md, ports CI/docs/backend CORS, launch.json.

**Eliminados:** `frontend/src/app/app.html`
