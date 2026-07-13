# impl_HU-034 — Catálogo unificado (amend)

**Fecha:** 2026-07-11  
**Feature:** HU-034 `in_progress` → awaiting reviewer (re-review tras CHANGES_REQUESTED)  
**Verify:** `./verify.ps1 -Quick` → **PASA** (lint + ruff + deps + FE unit 42/42)

## Qué se hizo

### Backend
- `catalog_aptitudes.py` — aptitudes multi-tarea + `CANONICAL_TYPES` + `parse_modality`.
- `catalog_categorize.py` — categorías `video`/`imagen`/`embedding`/`audio`/`multimodal`.
- `catalog_image_entries.py` — HF / **SiliconFlow** / Runware / fal.ai en catálogo (`category=imagen`), preload curado sin claves.
- `image_model_list.py` — `SILICONFLOW_MODELS` curado (R2).
- `catalog_builder/gather/refresh` — agregación unificada + cache `image_providers`.
- `llm_settings_router.py` — `types` canónicos; filtro category **o** aptitudes; unlock con `ALL_PROVIDERS`.
- `enabled_models_router._validate_enabled_models` — tests R7 (imagen unificada + defaults inyectados).

### Frontend
- Labels/proveedores imagen + tipo `video`.
- Drawer chips de tipo; badge categoría en filas.
- `CatalogModel.aptitudes` tipado.
- Fix TS4111: `MODALITY_META['video']` en spec.

### Lint colateral (verify C6)
- Autofix eslint/prettier en `ova-workspace/**` (CRLF + prettier) — fuera de lógica HU-034, requerido para `verify.ps1 -Quick` verde.

## Mapa criterio → test

| Criterio | Test |
|---|---|
| 1 Chat providers imagen/video | `test_categorize_*`, `test_parse_modality_*` |
| 2 HF/SF/Runware/fal.ai imagen | `test_curated_image_providers_in_catalog` (incl. **siliconflow**) |
| 3 Video listado | `test_parse_modality_*`, categorize keywords |
| 4 Filtros multimodal/embedding/audio | `test_canonical_types_*` + FE `TYPE_LABELS` |
| 5 Multimodal multi-tarea | `test_multimodal_aptitudes_*` |
| 6 Dedupe provider+id | `test_dedupe_by_provider_and_model_id` |
| 7 Enable/disable | `test_enabled_models_validate.py` (4 tests: accept image, omit disabled, reject unknown, reinject defaults) |
| 8 Sin tocar credenciales | sin cambios en key routers |
| 9 verify | `./verify.ps1 -Quick` PASA |

## Fix review CHANGES_REQUESTED (2026-07-11)
1. [x] `MODALITY_META['video']` — ng test harness verde
2. [x] SiliconFlow en curated preload + assert
3. [x] Tests R7 `_validate_enabled_models`
4. [x] `verify.ps1 -Quick` PASA

## Fuera de alcance (HU-035)
- Retiro `media-task-card`
- Switches imagen/video + pipeline
- Asignación master-detail completa
