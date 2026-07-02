# impl_p2-polish-final — P2 Angular migration polish (final pass)

**Fecha:** 2026-07-01  
**Contexto:** Audit 30/30 PASS, `verify.ps1 -Quick` green pre-P2. User request: "haz p2".

## Completado

### 1. Theme service dedup
- Eliminado `ProfileService.saveTheme` (duplicaba `ThemeSettingsService.saveTheme`).
- `theme-modal.component.ts` ya usaba `ThemeSettingsService`; perfil no llamaba `saveTheme`.
- **Fuente única:** `core/settings/services/theme-settings.service.ts`.

### 2. Dead code cleanup
- Eliminado `platform-llm-config-card.component.ts` — sin importadores en disco (`ModelAssignmentPanel` en `/models` lo reemplaza).
- `admin-platform-page.component.ts` ya no existía en disco (ruta `/admin/platform` → redirect `/models`).
- `fallback-page.component.ts` ya ausente (ruta `/fallback` → redirect `/models`).

### 3. Interactive gn-tabs
- Reescrito `core/components/ui/tabs.component.ts` con contexto `TABS_API`:
  - `TabsTriggerComponent`: click + `data-state` / `aria-selected`.
  - `TabsContentComponent`: `@if (isActive)` — solo renderiza panel activo.
  - `TabsComponent`: `[(value)]` two-way para sync programático (`goToApiKeys`).
- `models-page.component.html`: `[defaultValue]` → `[(value)]="activeTab"`.

### 4. Bundle size (light touch)
- **Sin cambio de budgets** — `angular.json` initial warning ~1.08 MB vs 500 kB warning / 1.1 MB error es pre-existente.
- **Sentry:** ya lazy via dynamic `import("@sentry/angular")` en `core/lib/observability/sentry.ts` (`initSentry`, `captureException`). No refactor adicional.

### 5. Biome vs TS4111
- Helper `lookupModalitySymbol()` en `model-task-card.helpers.ts` con `biome-ignore lint/complexity/useLiteralKeys` (único punto).
- Chips y user-override delegan al helper — build TS4111 + lint green.

### 6. useModalDismiss pattern
- Nuevo `core/directives/modal-dismiss.directive.ts` — Escape a nivel documento (paridad React `useModalDismiss`).
- Cableado en 4 modales backdrop custom: `phase-select-modal`, `manage-models-modal`, `connect-provider-modal`, `llm-settings-modal`.
- Modales PrimeNG `p-dialog` siguen usando `(onHide)` nativo.

### 7. Documentación
- Actualizado `impl_audit-closure.md` sección P2.
- `CHECKPOINTS.md`: C10 theme dedup, C11 dead card eliminado.

### 8. frontend-react-legacy — archivado (2026-07-01)

**Estado:** movido a `archive/frontend-react-legacy/` tras intento E2E local (ver `impl_e2e-archive-legacy.md`).

| Referencia | Ubicación | Acción |
|---|---|---|
| Carpeta completa | `archive/frontend-react-legacy/` | Archivada |
| CORS 5173 legacy | `backend/main.py` | Pendiente limpieza opcional |
| Spec histórica | `sdd/specs/EN-011` ref 5173 | Doc histórica |

## Omitido / sin cambio

| Item | Motivo |
|---|---|
| Eliminar `frontend-react-legacy/` | Archivado 2026-07-01 → `archive/frontend-react-legacy/` |
| Refactor bundle / lazy routes masivo | Light touch only; Sentry ya lazy |
| `ova-theme-modal` gnModalDismiss | 4 modales ya cubren el patrón DRY; PrimeNG modals no lo necesitan |

## Verificación

```
frontend/: pnpm lint      → exit 0 (8 warnings, 23 infos pre-existentes)
frontend/: pnpm typecheck → exit 0
frontend/: pnpm build     → exit 0 (budget warning initial 1.10 MB vs 500 kB warning)
repo root: ./verify.ps1 -Quick → PASA (4/4)
```

## Archivos tocados

**Nuevos:** `core/directives/modal-dismiss.directive.ts`, este doc.

**Modificados:** `tabs.component.ts`, `profile.service.ts`, `model-task-card.helpers.ts`, `model-task-card-chips.component.ts`, `user-override-section.component.ts`, `models-page.component.html`, `phase-select-modal` (.ts/.html), `manage-models-modal` (.ts/.html), `connect-provider-modal` (.ts/.html), `llm-settings-modal` (.ts/.html), `impl_audit-closure.md`, `CHECKPOINTS.md`.

**Eliminados:** `core/settings/components/platform-llm-config-card.component.ts`.
