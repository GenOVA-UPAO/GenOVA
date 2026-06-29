# Implementación EN-017 — Panel de Nodos/Agentes Prometheus

## Archivos creados/modificados

### Backend
- `backend/config.py` — añadido `ova_images: str = "1"` en sección Generación OVA
- `backend/prometheus/nodes_config.py` (NUEVO, 143 líneas) — NODES list, VIDEO_RESOURCE_TYPES, is_video_resource, config store con TTL 30s (load_stored, stored_cached, invalidate, get_nodes_config, save_nodes_config)
- `backend/users/admin/platform_settings_router.py` — añadidos endpoints GET/PUT `/api/admin/nodes-config`
- `backend/prometheus/plans/two_step.py` — imagen enrichment condicionado a `get_nodes_config().ova_images != "0"`
- `backend/prometheus/critic_loop.py` — `_critic_enabled()` y `max_rounds` leen de `get_nodes_config()`
- `backend/prometheus/refine.py` — `_refine_enabled()` lee de `get_nodes_config()`
- `backend/prometheus/nodes/editor.py` — `editor_node()` lee `ova_editor` de `get_nodes_config()`

### Tests backend
- `tests/features/setup/EN-017_nodes-config.feature` — 4 escenarios BDD
- `backend/tests/step_defs/test_nodes_config_steps.py` — step defs (monkeypatching stored_cached/load_stored/save_nodes_config)

### Frontend
- `frontend/src/services/ovaSettingsService.js` — añadidos `getAdminNodesConfig`, `saveAdminNodesConfig`
- `frontend/src/hooks/admin/useAdminNodesConfig.js` (NUEVO) — hook con useQuery + useMutation
- `frontend/src/components/settings/PlatformNodesCard.jsx` (NUEVO, 178 líneas) — card completa con Toggle, NodeBadge, ConfigurableRow
- `frontend/src/pages/AdminPlatformPage.jsx` — añadido `<PlatformNodesCard />` tras `<PlatformLlmConfigCard />`
- `frontend/src/components/PhaseSelectModal.jsx` — añadida consulta nodes-config + VIDEO_RESOURCE_TYPES + prop showVideoHint
- `frontend/src/components/engage/ResourceCard.jsx` — añadida prop `showVideoHint` con badge "⚠ Modo prompt"
- `frontend/src/lib/nodesConfigDraft.js` (NUEVO) — helpers puros: criticRoundsVisible, hasUnsavedChanges, isVideoResource
  - `PlatformNodesCard.jsx` importa `criticRoundsVisible` (param visibility) y `hasUnsavedChanges` (save button guard)
  - `PhaseSelectModal.jsx` importa `isVideoResource` (reemplaza const LOCAL `VIDEO_RESOURCE_TYPES` y llamada inline)

### Tests frontend unit
- `tests/features/admin/nodes-config-unit.feature` — 6 escenarios de lógica pura
- `tests/steps/unit/nodes_config_unit.steps.js` — step defs
- `tests/cucumber.unit.config.mjs` — añadido nodes-config-unit.feature

## Mapa trazabilidad

| Criterio | Test |
|---|---|
| GET retorna nodos con config defaults | `test_get_defaults` |
| PUT guarda flags y GET refleja cambio | `test_put_and_get` |
| PUT inválido → 400 | `test_put_invalid_flag` |
| ova_images="0" desactiva imagen | `test_toggle_images_off` + unit `isVideoResource` |
| Crítico rondas visibles/ocultas por toggle | `criticRoundsVisible retorna true/false` (usado en PlatformNodesCard showParam) |
| hasUnsavedChanges detecta cambios | unit scenarios 3/4 (usado en PlatformNodesCard hasChanges) |
| isVideoResource por fase | unit scenarios 5/6 (usado en PhaseSelectModal) |
| EN-015/EN-016 no regresionan | 49 backend tests green |

## Decisiones de diseño

- `get_nodes_config()` hace merge DB + settings.* en cada llamada (NO cachea el merge, solo el load_stored). Esto preserva la compatibilidad con monkeypatches en tests de EN-015/EN-016 que parchean `settings.ova_critic` directamente.
- Tests de nodes_config monkeypatchean `stored_cached`, `load_stored`, `save_nodes_config` (no `_cache`) para evitar divergencia de sesiones DB entre SessionLocal global y la sesión inyectada por el TestClient.
- Imports de `nodes_config` en critic_loop/refine/editor son lazy (dentro de función) para evitar circular imports y el overhead en cold start.
- `platform_config` tabla añadida al DDL del test fixture.
