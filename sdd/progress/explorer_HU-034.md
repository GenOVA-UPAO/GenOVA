# Explorer report — HU-034 Catálogo unificado (amend)

## Archivos relevantes

### Catálogo LLM (origen actual)

| Archivo | Rol / impacto amend |
|---|---|
| `backend/llm/catalog/providers_data.py` (~180) | Allowlist curada `CATALOG_ENTRIES` (groq/openrouter/opencode/hf text). Seed sin API keys. |
| `backend/llm/catalog/model_catalog.py` (~122) | Rebuild `CATALOG`, `DEFAULTS`/`TASKS`, validación assignment. Solo tareas texto/código/orquestador/razonamiento. |
| `backend/llm/catalog/catalog_refresh_providers.py` (~151) | Fetch: OpenRouter `/models`, Groq SDK, OpenCode, HF Hub `pipeline_tag=text-generation`. Merge `active` en allowlist. |
| `backend/llm/catalog/catalog_gather.py` (~90) | Parallel fetch (4 workers) + fallback `catalog_cache` + dedupe `(provider, model_id)`. |
| `backend/llm/catalog/catalog_refresh.py` (~137) | Orquestador in-memory `_catalog` / `_full_catalog` + `_provider_status` (4 providers). Startup + retry. |
| `backend/llm/catalog/catalog_builder.py` (~103) | Construye `_full_catalog` con categoría única, pricing, modality. HF siempre `category=texto`. |
| `backend/llm/catalog/catalog_categorize.py` (~41) | Heurística `modality`→categoría + keywords código/razonamiento. **Una** categoría string. Sin `video`. |
| `backend/llm/catalog/catalog_cache.py` (~35) | Persistencia Supabase por provider (TTL 24h). Extensible a nuevos providers sin migración si la tabla es genérica. |
| `backend/llm/catalog/catalog_pricing.py` | Formato precios OpenRouter. |
| `backend/users/settings/llm_settings_router.py` (~165) | `GET /me/llm-settings` (catalog filtrado + `catalog_full` paginado). `POST .../refresh-catalog`. Query `category` = **provider**; `type` = categoría modelo. |
| `backend/users/settings/enabled_models_router.py` (~69) | `GET/PUT /me/enabled-models`; valida contra `get_full_catalog_entries()`. Rate-limit PUT. |
| `backend/main.py` | Lifespan `refresh_catalog`; `POST /api/admin/refresh-catalog`. |
| `backend/llm/providers.py` | `ALL_PROVIDERS` ya lista siliconflow/runware/falai/cloudflare; `TEXT_PROVIDERS` solo chat. |

### Frontend catálogo

| Archivo | Rol |
|---|---|
| `frontend/.../services/user-llm-settings.store.ts` (~191) | Estado `catalog` / `catalogFull`, filtros, infinite scroll, `toggleFavorite` → enabled-models. |
| `frontend/.../services/user-llm-settings.service.ts` | HTTP llm-settings, refresh-catalog, enabled-models, **también** `image-models`. |
| `frontend/.../components/model-catalog-browser.component.ts` | Browser por provider + toggle enable. |
| `frontend/.../components/model-catalog-row.component.ts` | Fila + `MODALITY_META`. |
| `frontend/.../lib/llm-catalog.utils.ts` | Labels solo groq/openrouter/opencode/huggingface. Modalities: text/multimodal/image/audio/embedding — **sin video**. |
| `frontend/.../components/models-master-detail.component.*` | Shell HU-035 UI; abre catálogo. |

### Circuito paralelo imagen (fuera del catálogo hoy)

| Archivo | Rol |
|---|---|
| `backend/llm/images/image_model_list.py` (~84) | Listas: HF Hub text-to-image (dinámico), SiliconFlow `/v1/models` filtrado keywords, Runware/fal **curadas estáticas**. |
| `backend/llm/images/image_providers.py` (~225 ⚠️ >200) | Gen imagen: hf/siliconflow/runware/falai/cloudflare → data-URI. `IMAGE_PROVIDERS`, `enrich_with_images`. |
| `backend/llm/images/images.py` | Helper HF FLUX. |
| `backend/users/settings/ova_settings_router.py` (~86) | `GET/PUT /me/ova-settings`; `GET /me/image-models?provider=`. Defaults incl. `cloudflare`. |
| `backend/users/models.py` | `enabled_models` JSONB + `ova_settings` JSONB `{max_images, image_provider, image_model}`. |
| `frontend/.../components/media-task-card.component.ts` | UI imagen vía ova-settings (amend HU-035 D4: **retirar**). |
| `frontend/.../services/ova-settings.service.ts` | Cliente ova-settings. |
| Consumidores gen: `engage_router.py`, `jobs_router.py`, `prometheus/plans/two_step.py` leen `ova_settings` → `enrich_with_images`. |

### Docs / tests

- Doc: `docs/catalogo-modelos.md` (baseline HU-034).
- Spec amend: `sdd/specs/HU-034_catalogo-modelos-apis.md`; asunciones `sdd/progress/spec_assumptions_HU-034_035.md`.
- Tests dedicados de catálogo/refresh/categorize: **casi ausentes** (solo uso incidental de `enabled_models` en Prometheus/auth fixtures). Riesgo de regresión.

## Dependencias

```
startup/admin/user refresh
  → catalog_gather (_fetch_openrouter|groq|opencode|huggingface)
  → merge_* → _rebuild_catalog (CATALOG_ENTRIES)
  → _build_full_catalog + categorize_model
  → in-memory + optional catalog_cache

GET /me/llm-settings
  → get_catalog_entries (curado filtrado por enabled)
  → get_full_catalog_entries (browser)
  → enabled_models (User)

PUT /me/enabled-models
  → valid_keys ⊆ full_catalog  ※ modelos imagen deben estar en full_catalog primero

GET /me/image-models  (paralelo)
  → resolve_key(provider) → image_model_list.get_image_models
  → NO escribe ni lee catalog_refresh

Generation imagen
  → User.ova_settings → image_providers.get_image_data_uri
  → independiente de enabled_models / catalog
```

- `categorize_model` usado solo por `catalog_builder` (OpenRouter/Groq path).
- `IMAGE_PROVIDERS` / listas curadas en `image_model_list` son el **mejor punto de reuso** para ingest imagen al catálogo unificado.
- OpenRouter ya entrega `architecture.modality`; hoy se mapea `image`→`imagen` pero el builder no prioriza video ni aptitudes múltiples.
- HF aparece **dos veces**: text-generation en catalog fetch vs text-to-image en `image_model_list` — mismo `provider` string, distinto pipeline.

## Puntos de extensión (ingest unificado)

1. **`catalog_gather` / `_provider_status`**: añadir workers para siliconflow, runware, falai (y opcional cloudflare); ampliar status dict + cache keys.
2. **Fetchers**: reutilizar `image_model_list` (SF dinámico, Runware/fal estáticos, HF image Hub) en vez de duplicar; OpenRouter ya en `_full_catalog` — filtrar/reclasificar entradas con modality image/video.
3. **`catalog_builder`**: ramas nuevas `category: "imagen"|"video"|…`, pricing opcional, `modality` coherente; HF text vs HF image no colisionan si `model_id` difiere, pero labels/filters deben distinguir aptitud.
4. **`catalog_categorize`**: hoy 1 categoría; amend (D7) necesita **aptitudes múltiples** (p.ej. `categories: string[]` o `tasks_capable`) para multimodal asignable a varias tareas — cambio de schema de entrada del catálogo + frontend filtros.
5. **Añadir `video` a `MODALITY_CATEGORY` + `MODALITY_META` / `PROVIDER_LABELS`**.
6. **Enable/disable** ya valida contra full catalog → tras ingest, toggles imagen/video funcionan sin router nuevo.
7. **No tocar generación** en HU-034 (consumo cadena = HU-035); mantener `ova_settings` operativo hasta migración.

## Riesgos

- **Dos circuitos**: UI/catálogo unificado vs runtime `ova_settings` — confusión UX si el usuario habilita en catálogo pero gen sigue el provider de ova-settings hasta HU-035.
- **Categoría singular** vs D7 multimodal multi-tarea: breaking change de contrato `category` string → lista; afecta filtros `type`, master-detail, assignment pool.
- **Filtro mal nombrado**: query `category` = provider; `type` = categoría — UI/API confusas al añadir imagen/video/embedding/audio.
- **HF dual pipeline**: mezclar text+image bajo mismo provider sin `modality`/`category` claros → falsos positivos en filtros.
- **Runware/fal estáticos**: listas desactualizadas; sin API listing simple (ya documentado en `image_model_list`).
- **OpenRouter volumen**: cientos de modelos; imagen/video mezclados aumentan ruido y paginación.
- **Límite líneas**: `image_providers.py` ya 225 (>200); tocar gen+listas fuerza split. `catalog_refresh_providers` / gather crecerán — planear módulo `catalog_image_ingest` o similar.
- **Cobertura tests baja** en zona catalog — amend debería exigir tests de categorize multi-aptitud + merge image providers + dedupe.
- **Cloudflare** en IMAGE_PROVIDERS/defaults pero no en TEXT catalog ni labels FE; amend scope lista HF/SF/Runware/fal (+ OR image/video) — decidir si Cloudflare entra o queda solo legacy ova_settings.
- **Sin migración SQL** probable para catálogo (cache por provider + JSONB enabled_models), pero schema de entrada del full_catalog es breaking para FE.

## Complejidad: 4/5

Cross-stack (backend ingest + schema de categoría + FE browser/labels) unificando dos pipelines (catalog chat vs image_model_list/ova_settings). No es auth/billing ni backfill de sesiones (no 5), pero tampoco “solo 2–3 archivos” (no 2–3): requiere diseño de aptitudes múltiples + varios providers + riesgo de romper enable/assignment.

## Escalación sugerida

- Spec detallada con contrato de entrada (`categories[]` / aptitudes), matriz provider→fetcher, y qué hacer con Cloudflare.
- **No mezclar** migración runtime `ova_settings`→cadena imagen (eso es HU-035) en el mismo diff de ingest.
- Reviewer estricto + tests unitarios de builder/categorize/gather.
- Si el amend crece a “también cablear gen a cadena”: dividir en sub-features (034 ingest+UI | 035 assignment+runtime) — ya es el orden acordado; confirmar puerta humana antes de implementar.
