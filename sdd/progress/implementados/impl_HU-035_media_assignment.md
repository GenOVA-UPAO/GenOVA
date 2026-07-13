# impl_HU-035 — Asignación unificada imagen/video

**Fecha:** 2026-07-11  
**Feature:** HU-035 `in_progress` → awaiting reviewer  
**Verify:** `./verify.ps1 -Quick` → **PASA** (lint + ruff + deps + FE unit 46/46)

## Qué se hizo

### Backend
- `llm_config_store`: `MEDIA_TASKS` / `CONFIG_TASKS`; `generation_enabled` (imagen on, video **off** by default); validación con `ALL_PROVIDERS`.
- `effective_media_slice` + `effective_llm_config` incluyen imagen/video + flags.
- `image_settings_resolve.py`: cadena imagen desde llm_config; legacy map `ova_settings.image_*`; `should_generate_video`.
- Pipeline (`jobs_router`, `engage_router`) usa `build_image_settings` (no circuito paralelo a largo plazo).
- `image_enrich.py`: respeta `enabled` + prueba cadena.
- `GET/PUT /api/admin/llm-config`: tasks = CONFIG_TASKS + catalog; payload acepta `generation_enabled`.
- `nodes-config`: `video_generation_enabled` expuesto.
- Split `image_backends.py` (límite 200 líneas).

### Frontend
- **Eliminado** `media-task-card` (+ helpers).
- Master-detail: imagen/video usan mismo primario + fallbacks; switch generación; pool filtrado por aptitudes (`task-model-pool.ts`).
- `llmConfigDraft`: `generationEnabled` ↔ `generation_enabled` en payload sticky save.
- `phase-select`: switch video off → prompts only (trata como sin gen).
- `model-assignment-panel` sin media card (legacy panel).

## Mapa criterio → test

| Criterio amend | Test |
|---|---|
| 1–2 Sin media-task-card; master-detail | `models-master-detail.component.spec.ts` (no media-card) |
| 3 Primario+fallbacks imagen/video | master-detail spec + `llmConfigDraft.spec.ts` |
| 4 Pool aptitudes / multimodal multi-tarea | `llmConfigDraft.spec.ts` → `modelsForTask` |
| 5–6 Video off default → prompts | master-detail video switch; `test_should_generate_video_off_by_default` |
| 7 Video on → cadena | `test_should_generate_video_requires_switch_and_chain` |
| 8 Mismo patrón switch imagen/video | UI switch en master-detail para ambos |
| 9–10 Pipeline + legacy | `test_build_image_settings_*`, `test_imagen_chain_*`, `test_legacy_*`, `test_enrich_skips_when_disabled` |
| 11 Sticky dirty / persist switches | `toPayload` incluye `generation_enabled`; models-page sticky spec |
| 12 verify | `./verify.ps1 -Quick` |

## Fuera de alcance
- Nuevos tipos de tarea; Prometheus redesign; HU-036; regenerar wireframe.
