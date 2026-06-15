# Catálogo de modelos LLM

> Configuración en dos capas: el usuario habilita modelos del catálogo completo (Perfil) y luego los asigna a cada tipo de tarea de generación (Workspace). Los modelos por defecto del sistema están bloqueados y nunca se deshabilitan.

---

## Archivos clave

| Archivo | Rol |
|---|---|
| `backend/llm/model_catalog.py` | Allowlist curado (9 modelos), defaults del sistema, validación |
| `backend/llm/catalog_refresh.py` | Fetch paralelo OpenRouter + Groq, merge con curados, catálogo completo |
| `backend/llm/catalog_cache.py` | Persistencia en Supabase (`catalog_cache`) con TTL 24 h |
| `backend/users/llm_settings_router.py` | GET/PUT de configuración por tarea (modelo + timeout) |
| `backend/users/enabled_models_router.py` | GET/PUT de toggle habilitar/deshabilitar modelos |
| `backend/llm/router.py` | Resolución runtime del modelo primario con validación de enabled |
| `frontend/src/components/settings/LlmSettingsCard.jsx` | UI del catálogo completo (~310 modelos) con búsqueda, filtros, scroll infinito |
| `frontend/src/components/settings/LlmSettingsForm.jsx` | Dropdowns de asignación por tarea + slider de timeout |
| `frontend/src/components/workspace/LlmSettingsModal.jsx` | Modal accesible desde el workspace sin ir a Perfil |
| `frontend/src/hooks/useLlmSettings.js` | Hook compartido (estado, búsqueda, paginación, toggle, save) |

---

## Resumen

GenOVA expone un catálogo de **~310 modelos** agregados de dos proveedores (Groq y OpenRouter). El sistema opera en **dos capas de configuración por usuario**:

1. **Capa 1 — Perfil (habilitar/deshabilitar)**: el usuario marca qué modelos del catálogo completo quiere tener disponibles. Los 4 modelos _default_ del sistema aparecen con candado 🔒 y el backend fuerza su inclusión.
2. **Capa 2 — Workspace (asignar)**: el usuario elige, para cada tipo de tarea (`texto`, `codigo`, `orquestador`, `razonamiento`), qué modelo usar y con qué timeout (30–300 s). Solo ve los modelos que habilitó en la Capa 1.

El catálogo se refresca al arrancar (fire-and-forget desde el `lifespan`) y bajo demanda desde un endpoint admin. La caché en Supabase permite reconstruir el catálogo incluso si ambas APIs fallan simultáneamente.

---

## Arquitectura (4 capas)

```
┌─────────────────────────────────────────────────────────────────┐
│ Capa 4 — API de usuario                                          │
│ llm_settings_router.py  (GET/PUT /me/llm-settings)               │
│ enabled_models_router.py (GET/PUT /me/enabled-models)            │
├─────────────────────────────────────────────────────────────────┤
│ Capa 3 — Persistencia                                            │
│ catalog_cache.py → tabla catalog_cache en Supabase (TTL 24 h)   │
│ models.py → User.enabled_models (JSONB), User.llm_settings (JSONB)│
├─────────────────────────────────────────────────────────────────┤
│ Capa 2 — Fetch + merge (startup / on-demand)                     │
│ catalog_refresh.py                                               │
│   · _fetch_openrouter() → GET /api/v1/models (sin auth)         │
│   · _fetch_groq()       → groq_client.models.list()            │
│   · ThreadPoolExecutor(max_workers=2) + timeout 20 s            │
│   · _merge_openrouter / _merge_groq → actualiza CATALOG_ENTRIES │
│   · _build_full_catalog() → catálogo completo (~310 modelos)    │
├─────────────────────────────────────────────────────────────────┤
│ Capa 1 — Allowlist curado                                        │
│ model_catalog.py                                                 │
│   · CATALOG_ENTRIES → 9 modelos conocidos y validados            │
│   · DEFAULTS → sistema bloqueado por tipo de tarea               │
│   · is_valid_model, merge_with_defaults, sanitize_settings       │
└─────────────────────────────────────────────────────────────────┘
```

### Capa 1 — Allowlist curado (`model_catalog.py`)

Lista hardcodeada de **9 modelos** de calidad probada para generación de OVAs:

| Provider | Model ID | Tarea |
|---|---|---|
| groq | `llama-3.3-70b-versatile` | texto |
| groq | `llama-3.1-8b-instant` | texto |
| groq | `qwen/qwen3-32b` | razonamiento |
| groq | `openai/gpt-oss-120b` | orquestador |
| openrouter | `deepseek/deepseek-v4-flash` | codigo |
| openrouter | `deepseek/deepseek-chat-v3.1` | codigo |
| openrouter | `qwen/qwen3-coder` | codigo |
| openrouter | `qwen/qwen3-coder:free` | codigo |
| openrouter | `meta-llama/llama-3.3-70b-instruct:free` | texto |

**Defaults del sistema** (bloqueados, nunca deshabilitables):

| Tarea | Provider | Modelo |
|---|---|---|
| texto | groq | `llama-3.3-70b-versatile` |
| codigo | openrouter | `deepseek/deepseek-v4-flash` |
| orquestador | groq | `openai/gpt-oss-120b` |
| razonamiento | groq | `qwen/qwen3-32b` |

Funciones clave: `is_valid_model()` — valida contra el `CATALOG` derivado; `merge_with_defaults()` — combina overrides de usuario con defaults; `sanitize_settings()` — valida un payload PUT completo (modelo + timeout).

### Capa 2 — Fetch + merge (`catalog_refresh.py`)

`refresh_catalog(db)` es la función central, llamada desde:
- **Lifespan** (startup): fire-and-forget — el backend no espera a que termine.
- **Admin endpoint**: `POST /api/admin/refresh-catalog` (rate-limited 2/min).

Flujo:
1. `ThreadPoolExecutor(max_workers=2)` lanza `_fetch_openrouter()` y `_fetch_groq()` en paralelo.
2. Timeout total: `CATALOG_REFRESH_TIMEOUT_S` + 5 s (default 20 s).
3. `_merge_openrouter()` / `_merge_groq()`: actualizan `pricing`, `context_length` y `active` en `CATALOG_ENTRIES` para cada modelo curado.
4. `_rebuild_catalog()`: regenera el `CATALOG` legacy (dict provider → [ids]).
5. `_build_full_catalog(or_data, groq_ids)`: construye la lista completa de ~310 modelos (curados + no curados) con categoría, pricing y metadata.
6. Si ambos fetches fallan → se conserva el catálogo pre-poblado con los 9 curados.
7. Persiste los datos crudos en `catalog_cache` de Supabase (si hay sesión DB).

Caché en memoria: `_catalog` (curados) y `_full_catalog` (completo), protegidos por `RLock`, leídos en cada request sin tocar DB.

### Capa 3 — Persistencia (`catalog_cache.py`)

Tabla `catalog_cache` en Supabase:

| Columna | Tipo | Notas |
|---|---|---|
| provider | VARCHAR | `'openrouter'` o `'groq'` |
| raw_data | JSONB | Respuesta cruda de la API |
| expires_at | TIMESTAMPTZ | `now() + 24h` |

`save_to_cache()` hace upsert (un row por provider). `load_from_cache()` devuelve datos si no expiraron. Esto permite reconstruir el catálogo offline si ambas APIs fallan.

Además, en `User`:
- `enabled_models` (JSONB): lista de `[{provider, model_id}]` que el usuario habilitó.
- `llm_settings` (JSONB): `{texto: {provider, model_id, timeout_s}, ...}`.

### Capa 4 — API de usuario

**`GET /api/users/me/llm-settings`** — query params: `search`, `category`, `page`, `page_size`. Retorna:
- `settings`: configuración efectiva por tarea (merge usuario + defaults).
- `catalog`: modelos curados filtrados por `enabled` del usuario (agrupados por provider).
- `catalog_full`: catálogo completo paginado (~310 modelos) con búsqueda/categoría aplicada.
- `categories`: enumeración de categorías disponibles.
- `defaults`, `enabled_models`, `timeout_bounds`.

**`PUT /api/users/me/llm-settings`** — persiste `{tarea: {provider, model_id, timeout_s}}` validado contra `sanitize_settings()`.

**`GET /api/users/me/enabled-models`** — lista actual de enabled + defaults.

**`PUT /api/users/me/enabled-models`** — recibe `[{provider, model_id}]`, valida contra el catálogo completo (`get_full_catalog_entries()`), fuerza-append de los 4 defaults, persiste en `User.enabled_models`.

---

## Flujo Perfil: habilitar / deshabilitar modelos

Componente: `LlmSettingsCard.jsx` → hook `useLlmSettings.js`.

### UI del catálogo completo

- **Búsqueda**: input con debounce 300 ms — busca por substring en `model_id` y `label`.
- **Filtros de categoría**: chips para `Todos`, `Recomendados`, `Texto`, `Código`, `Razonamiento`, `Multimodal`, `Imagen`, `Embedding`, `Audio`.
- **Scroll infinito**: `IntersectionObserver` sobre un elemento sentinel al final de la lista. Carga 50 modelos por página. `page_size` máximo en backend: 100.
- **Cada modelo muestra**: checkbox · nombre · badge de categoría · ★ (curado) / ⚠ (no optimizado) · pricing · context_length.

### Modelos default (bloqueados)

Los 4 modelos default muestran icono de 🔒 candado en lugar del checkmark. El checkbox está deshabilitado (`cursor-not-allowed`, `opacity-70`). El backend (`_validate_enabled_models`) fuerza su inclusión: aunque el usuario no los envíe en el PUT, se añaden automáticamente.

### Guardado

Botón "Guardar modelos" → `saveEnabledModels()` → `PUT /api/users/me/enabled-models` → recarga el catálogo filtrado (el dropdown de asignación solo muestra modelos enabled).

---

## Flujo Workspace: asignar modelo por tarea

Componentes: `LlmSettingsForm.jsx` (presentacional) + `LlmSettingsModal.jsx` (envoltura dialog).

### Acceso

- **Perfil**: `LlmSettingsCard` en `/profile` incluye el formulario debajo del catálogo.
- **Workspace / Crear OVA**: `GearButton` en la toolbar → abre `LlmSettingsModal` (dialog con `max-w-lg`). Mismo hook `useLlmSettings`, misma configuración.

### Dropdowns por tarea

Cuatro secciones: **Texto**, **Código / HTML interactivo**, **Orquestador**, **Razonamiento**.

Cada dropdown (`Select`) muestra solo los modelos que el usuario habilitó (filtrado server-side en `GET /me/llm-settings`: el backend cruza `CATALOG_ENTRIES` con `User.enabled_models`). Los modelos se agrupan por provider (`Groq` / `OpenRouter`) con etiquetas de pricing.

### Timeout por tarea

Slider numérico (`Input type="number"`) con rango **30–300 s**. Default: 120 s. El backend valida con `clamp_timeout()`; fuera de rango → 400.

### Botón "Restaurar por defecto"

Resetea el modelo y timeout de una tarea a los valores del sistema (`DEFAULTS`).

### Guardado

Botón "Guardar configuración" → `save()` → `PUT /api/users/me/llm-settings` → valida con `sanitize_settings()`. Si el modelo no está en `CATALOG` o el timeout está fuera de rango → 400.

---

## Fetch y refresco de APIs

### Startup (lifespan)

```python
# main.py — _background_catalog_refresh()
asyncio.create_task(asyncio.to_thread(_background_catalog_refresh))
```

Fire-and-forget: el backend arranca sin esperar. Si falla, el catálogo pre-poblado (9 curados) sigue disponible.

### Admin endpoint

```
POST /api/admin/refresh-catalog
```

- **Rate limit**: 2/min (`@limiter.limit("2/minute")`).
- **Auth**: `require_admin` (rol `administrador`).
- **Respuesta**: `{status: "ok", entries: N}`.
- Ejecuta `refresh_catalog(session)` con sesión DB → persiste en `catalog_cache`.

### Fetch paralelo

`ThreadPoolExecutor(max_workers=2)` con `as_completed(timeout=20s)`. Si un provider falla, el otro sigue. Si ambos fallan → se conserva el estado anterior.

---

## Categorización automática

`categorize_model(api_entry, provider)` en `catalog_refresh.py`:

1. Lee `architecture.modality` de la entrada de API.
2. Mapea vía `MODALITY_CATEGORY`: `text→texto`, `multimodal→multimodal`, `image→imagen`, `embedding→embedding`, `audio→audio`.
3. Si la categoría base es `texto` o `multimodal`, aplica **keyword overrides**:
   - `_CODIGO_KEYWORDS`: `coder`, `code`, `dev`, `programming`, `claude`, `gpt-4`, `deepseek`, `gemini-pro`, `gemini-flash`, `o1`, `o3`, `o4` → fuerza `"codigo"`.
   - `_RAZONAMIENTO_KEYWORDS`: `r1`, `reasoning`, `think`, `gpt-oss`, `gpt-5` → fuerza `"razonamiento"`.

Los keywords se buscan como substrings en el `model_id` en minúsculas.

---

## Pricing

`format_pricing(pricing)` convierte el pricing de OpenRouter (USD por **1 token**) a **USD por 1M tokens**:

| Caso | Display |
|---|---|
| Ambos 0 | `"Gratuito"` |
| `prompt=0`, `completion>0` | `"Free in · $X/1M out"` |
| Ambos >0 | `"$X/$Y por 1M tokens"` |
| Sin pricing | `None` → UI muestra "Gratuito" |

Groq siempre retorna `None` (gratuito). Los modelos gratuitos de OpenRouter (`:free`) suelen tener `pricing=0` en ambos.

---

## Búsqueda, categoría y paginación

`GET /api/users/me/llm-settings` acepta query params:

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `search` | string | `""` | Substring match sobre `model_id` y `label` |
| `category` | string | `"all"` | `all`, `recommended` (solo curados), o categoría específica (`texto`, `codigo`, etc.) |
| `page` | int | `1` | Página (1-based) |
| `page_size` | int | `50` | Máximo 100 |

Respuesta incluye `full_total`, `full_page`, `full_has_more` para soportar scroll infinito en el frontend. `categories` enumera todas las categorías disponibles en el catálogo completo.

---

## Validación

### Enabled models (`enabled_models_router.py`)

`_validate_enabled_models()`:
- Cada `{provider, model_id}` se valida contra `get_full_catalog_entries()` (~310 modelos).
- IDs no reconocidos → 400.
- Deduplica por `(provider, model_id)`.
- **Fuerza-append de los 4 defaults**: si el usuario no los incluye, se añaden automáticamente. Resultado: los defaults **siempre** están enabled.

### LLM settings (`llm_settings_router.py`)

`sanitize_settings()`:
- Solo acepta tipos conocidos (`texto`, `codigo`, `orquestador`, `razonamiento`).
- `provider` + `model_id` deben pasar `is_valid_model()` → deben estar en `CATALOG` (curados activos).
- `timeout_s` debe pasar `clamp_timeout()` → 30–300.
- Cualquier invalidación → `ValueError` → 400.

### Runtime (`llm_router.py`)

`_resolve_primary(tarea, llm_config, enabled_models)`:
1. Toma el override del usuario (si existe y es válido).
2. Verifica que el modelo esté en `enabled_models` del usuario O sea un default del sistema.
3. Si no pasa → silenciosamente usa el default del sistema.
4. Los defaults siempre pasan (están en `_DEFAULT_KEYS` y `is_default_model()` retorna `True`).

---

## Endpoint admin

```
POST /api/admin/refresh-catalog
```

- **Acceso**: solo `administrador`.
- **Rate limit**: 2 peticiones por minuto.
- **Acción**: ejecuta `refresh_catalog(session)` → fetch paralelo + merge + persistencia en `catalog_cache`.
- **Respuesta**: `{status: "ok", entries: 9}` (número de entradas curadas activas).
- **Errores**: si el fetch falla → 502 con detalle del error.

---

## Referencias

- Feature: [HU-034 — Catálogo unificado de modelos](../feature_list.json) (status: `done`, commit: `f143a76`)
- Spec: `sdd/specs/HU-034_catalogo-modelos-apis.md` (si existe)
- Archivos principales: listados en la [tabla de archivos clave](#archivos-clave)

## Ver también

- [Workspace de edición de OVA](workspace.md) — donde se usan los modelos asignados
- [Pipeline de generación 5E](generacion-5e.md) — cómo se invocan los modelos en cada fase
- [API reference](api.md) — todos los endpoints REST
- [Labs — Iteración de prompts](labs.md) — interfaz de prueba de modelos y prompts
