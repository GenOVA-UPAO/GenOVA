# Sesión actual

**Fecha:** 2026-06-27
**Agente:** Antigravity (implementer)
**Sprint:** 3

## Resumen

Sesión de Screaming Architecture Cleanup — 6 fases ejecutadas sobre el frontend React.
Build ✓ (697ms). BDD unit 63/63 PASA. Lint: 11 errores pre-existentes, 0 nuevos.

## Hecho en esta sesión

### Fase 5 — Wireframes eliminados del bundle
- Eliminados 22 archivos de `features/wireframes/` y `features/ova_library/components/wireframes/`
- Eliminadas 13 rutas `/wireframe*` de `App.tsx`
- Eliminados 13 `lazy()` imports de wireframes en `App.tsx`
- `resourceWireframes.ts` vaciado (RESOURCE_WIREFRAMES = {}) — consumidor `ResourcePreviewPanel` ya maneja `Wireframe=undefined` con `{Wireframe && ...}`

### Fase 1 — Deuda técnica documentada
- Creado `docs/arquitectura-frontend-deuda.md` — inventario de 13 archivos LLM en `core/` con mapeo → `features/llm/` propuesto
- Añadida sección "Technical Debt" en `frontend/README.md`

### Fase 6C — Layouts unificados
- `AppLayout.tsx` recibe prop `fullBleed?: boolean`
  - `false` (default) → `<MainContainer />` (comportamiento previo)
  - `true` → auth guard + `<main><Outlet /></main>` full-bleed
- `WorkspaceLayout.tsx` eliminado
- `App.tsx`: `<Route element={<WorkspaceLayout />}>` → `<Route element={<AppLayout fullBleed />}>`

### Fase 4 — Fallback LLM unificado
- Nuevo `core/lib/llm/fallbackArray.ts` — 4 funciones puras: `moveIn`, `addEmpty`, `removeAt`, `setAt`
- `llmConfigDraft.ts` refactorizado — delega en `fallbackArray`
- `llmSettingsMutations.ts` refactorizado — delega en `fallbackArray`
- `LlmEnginesPanel.tsx` limpiado — elimina `_pricingShort` local y `PROVIDER_LABELS` local, importa de `llmCatalogUtils.ts`

### Fase 2 — ovaSettingsService split
- Nuevo `features/admin/services/adminSettingsService.ts` — 6 funciones admin (LLM config, nodes config, platform config)
- Nuevo `features/ova_workspace/services/userLlmSettingsService.ts` — 3 funciones user (API keys, image models)
- `ovaSettingsService.ts` reducido a solo `getOvaSettings`/`saveOvaSettings`
- Actualizados imports en: `useAdminLlmConfig`, `useAdminNodesConfig`, `PlatformApiKeysCard`, `PhaseSelectModal`, `useImageModels`, `KeyRow`, `ApiKeysCard`

### Fase 3 — Preview HTML consolidado
- Nuevo `core/components/HtmlPreviewFrame.tsx` — encapsula blob URL lifecycle + iframe sandbox
- `HtmlCodePreview.tsx` refactorizado — usa `HtmlPreviewFrame`
- `HtmlPreview.tsx` (student/engage) refactorizado — usa `HtmlPreviewFrame`
- `WorkspaceHtmlPreview.tsx` refactorizado — usa `HtmlPreviewFrame`

### Fase 6A — formatDate compartido
- Nuevo `features/ova_library/lib/formatDate.ts`
- `OvaCard.tsx` y `TrashedOvaCard.tsx` importan de ahí

### Fase 6B — OvaCardShell
- Nuevo `features/ova_library/components/cards/OvaCardShell.tsx` — estructura compartida con slots
- `OvaCard.tsx`: 247 → ~170 líneas
- `TrashedOvaCard.tsx`: 93 → ~60 líneas

### Fase 6D — createAdminConfigHook
- Nuevo `features/admin/hooks/createAdminConfigHook.ts` — factory genérica `useQuery + useMutation`
- `useAdminLlmConfig.ts` usa la factory para la parte config+save; mantiene `catalog` extra
- `useAdminNodesConfig.ts` = directamente el hook generado por factory (25 → 12 líneas)

### Fase 6E — adminUsersService
- Refactorizado a arrow functions + alias `@/` — shape `SendResult` mantenido por compatibilidad con `useUsersAdmin`

## Próximo paso

Proponer commit al humano. Verificar si `TA-008` (migración LLM de core → features/llm) entra a Sprint 3 o a Sprint 4.

