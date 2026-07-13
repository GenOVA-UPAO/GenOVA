# Review — HU-035 media assignment unificada

**Veredicto:** APPROVED

**Scope:** Amend 2026-07-11 (catálogo unificado + media) — `impl_HU-035_media_assignment.md`  
**Evidencia:** `./verify.ps1 -Quick` → `RESULTADO FINAL: PASA` (2026-07-12); pytest `test_hu035_media_assignment.py` + `test_llm_config_store.py` → 24 passed

## Trazabilidad criterios ↔ tests

- **(1–2)** Sin `media-task-card`; imagen/video en master-detail: [x] `models-master-detail.component.spec.ts` (`no media-task-card`); git `D` de `media-task-card.component.{ts,html}` + helpers; cero imports en `frontend/src`
- **(3)** Primario + fallbacks imagen/video: [x] master-detail spec + UI `gn-llm-task-row` / chips; `llmConfigDraft.spec.ts`
- **(4)** Pool aptitudes / multimodal multi-tarea: [x] `llmConfigDraft.spec.ts` → `modelsForTask`
- **(5–6)** Video off default → solo prompts: [x] `test_should_generate_video_off_by_default`; master-detail `video switch off…prompts-only`; `phase-select.service.ts` + `nodes-config` `video_generation_enabled`
- **(7)** Video on → requiere cadena: [x] `test_should_generate_video_requires_switch_and_chain` (`video_chain` + switch)
- **(8)** Mismo patrón switch imagen/video: [x] `isMediaTask` + un solo `role="switch"` en master-detail para ambos
- **(9–10)** Pipeline imagen + legacy `image_*`: [x] `test_build_image_settings_*`, `test_imagen_chain_*`, `test_legacy_*`, `test_enrich_skips_when_disabled`; consumo en `jobs_router` / `engage_router`
- **(11)** Sticky dirty / persist switches: [x] `models-page.component.spec.ts` sticky; `toPayload` incluye `generation_enabled` (`llmConfigDraft.spec.ts`)
- **(12)** `./verify.ps1 -Quick`: [x] PASA

## Lint + ruff

- pnpm lint: [x] OK
- ruff check: [x] OK

## Tests

- pnpm test:unit (FE): [x] OK (46/46)
- pytest HU-035 + llm_config_store: [x] OK (24/24)
- pytest step_defs: [x] N/A en scope `-Quick` (criterio amend = Quick)

## Auto-fix de tests (si aplica)

- N/A — verify verde sin reparación

## Checkpoints

- C1: [x] (unit FE + tests feature; Quick)
- C2: [x]
- C3: [x] (touched: master-detail 129, models-page 228, llm_config_store 180, image_settings_resolve 115, image_backends 138)
- C4: [x]
- C5: [x]
- C6: [x] (`verify.ps1 -Quick` PASA)
- C7: [x] (FE services/signals; BE resolve/store sin lógica de negocio en routers nuevos)

## Checks adicionales

- G (Docs al día): [x] OK — cambio interno `/models` + resolve; no altera arranque público ni contratos documentados en README/CLAUDE
- H (Migración BD): [x] N/A — sin cambio de schema ORM

## Cambios requeridos (si aplica)

Ninguno.
