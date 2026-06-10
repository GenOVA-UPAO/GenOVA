# Pipeline de generación (metodología 5E)

GenOVA genera Objetos Virtuales de Aprendizaje (OVA) aplicando la metodología **5E**.
Hoy implementa las dos primeras fases: **ENGAGE** (enganchar) y **EXPLORE** (explorar).
Cada fase ofrece **10 tipos de recurso**; el usuario elige hasta 4 por fase y el backend
los genera con LLMs reales, valida el HTML y empaqueta todo en un único paquete SCORM 1.2.

El formato de cada recurso está fijo en el prompt, pero **todo el contenido se adapta al
`concept`** que el usuario describe (la plataforma está orientada a enseñanza de IA / ML).

---

## Tipos de recurso (1–10)

Definidos en `RECURSOS_META` (`backend/agents/engage_prompts.py`); EXPLORE usa el mismo
catálogo con prompts optimizados para mayor profundidad.

| # | Tipo | Duración | Interactividad |
|---|---|---|---|
| 1 | 🎭 Cómic Interactivo | 1–2 min | Alta |
| 2 | 🎬 Storyboard de Video | 40 seg | Baja |
| 3 | 🎙️ Micro-Podcast | 45 seg | Baja |
| 4 | 🎮 Juego de Gamificación | 1–2 min | Alta |
| 5 | ⚖️ Dilema Ético | 2–3 min | Media |
| 6 | 📰 Noticia de Impacto | 1–2 min | Baja |
| 7 | 🎯 Juego de Roles | 2–3 min | Media |
| 8 | 📅 Timeline Interactivo | 2–3 min | Media |
| 9 | 🔐 Escape Room Virtual | 3–4 min | Alta |
| 10 | 🎛️ Simulador Intuitivo | 2–3 min | Alta |

---

## Flujo de generación

Para la mayoría de recursos, generar es un pipeline de **dos pasos**:

```
prompt + concept (+ contexto RAG)
   │
   ├─ Paso 1: LLM "texto" → JSON estructurado (guion, rondas, caso, etc.)
   │            (+ imágenes en paralelo si el JSON trae prompt_imagen)
   │
   └─ Paso 2: JSON + concept → LLM "código" → HTML autocontenido
                → validador + auto-reparación → HTML final con callbacks SCORM
```

Casos especiales:
- **Recurso 10 (Simulador)**: generación directa de código en un solo paso (sin JSON).
- **Recurso 3 (Micro-Podcast)**: el LLM produce un monólogo en primera persona; se sintetiza
  audio con **TTS de Groq** (`backend/agents/audio_helpers.py`) y se envuelve en un reproductor HTML.

Endpoints: `POST /api/agents/engage/generate` y `POST /api/agents/explore/generate`
(ver [api.md](api.md)). El frontend genera secuencialmente, con reintentos individuales y
estados en vivo (`generando` / `reintentando` / `done` / `failed`).

---

## Enrutado de LLM y cadena de fallback

`backend/agents/llm_router.py` → `generar_texto(prompt, tarea, max_tokens)`. Cada **tarea**
tiene un modelo primario y una cadena de respaldo que se recorre ante cualquier error
recuperable.

**Modelos primarios** (`_MODELOS`):

| Tarea | Proveedor | Modelo |
|---|---|---|
| `texto` | Groq | `llama-3.3-70b-versatile` |
| `codigo` | OpenRouter | `deepseek/deepseek-v4-flash:free` (284B MoE, 1M ctx) |
| `orquestador` | Groq | `openai/gpt-oss-120b` (`reasoning_effort: medium`) |
| `razonamiento` | Groq | `qwen/qwen3-32b` |

**Cadenas de fallback** (`_FALLBACK_CHAIN`), recorridas en orden con backoff exponencial
(máx 8 s):

- **`codigo`**: DeepSeek V4 Flash (paid) → `qwen3-coder:free` → Llama 3.3 70B (OR free) → Llama 3.3 70B (Groq)
- **`texto`**: `llama-3.1-8b-instant` (Groq) → Llama 3.3 70B (OR free)
- **`orquestador`**: `qwen3-32b` (Groq) → `llama-3.1-8b-instant`
- **`razonamiento`**: `gpt-oss-120b` (`effort: low`) → `llama-3.1-8b-instant`

**Errores recuperables** que disparan el fallback (`_RECOVERABLE_ERRORS`): rate-limit de Groq
y OpenRouter, `APIStatusError` (incluye 402 sin crédito y 5xx) y `EmptyContentError` (modelos
de razonamiento que devuelven el contenido vacío).

**Filtro de modelos expuestos**: `OVA_ENABLED_LLMS` (CSV) limita qué IDs ve el selector del
frontend vía `GET /api/ova/llm-options`. Vacío = todos.

> También existe `generar_texto_with_model(...)` (modelo arbitrario, usado por Labs) y
> `generar_vision(...)` (Llama-4-Scout para análisis de imágenes en RAG).

---

## Validación y auto-reparación de HTML

`backend/agents/html_validator.py` revisa cada HTML antes de devolverlo:

1. `<!DOCTYPE html>` presente.
2. Cierres `</html>` / `</script>` (detecta truncado).
3. **Callbacks SCORM** (`_scormInit`, `_scormComplete`, `cmi.core.lesson_status`).
4. Longitud mínima por (fase, tipo) — `_MIN_CHARS`.
5. Sin CDNs externos prohibidos (jsDelivr, CloudFlare, unpkg, jQuery, Bootstrap, Google Fonts…).

**Auto-reparación**: cierra `<script>`/`</body>`/`</html>` faltantes e inyecta los callbacks
SCORM antes de `</body>`. Devuelve `(html_reparado, fallas_restantes)`; las fallas nunca
bloquean la respuesta — el cliente recibe el mejor HTML posible más metadata `quality_checks`.

---

## RAG (contexto desde archivos del usuario)

Si el usuario sube archivos (`POST /api/uploads/temp`) y pasa sus `upload_ids` al generar,
el pipeline recupera los top-K chunks (`backend/rag/`), construye un contexto y lo inyecta en
los prompts para anclar la generación. Embedder por defecto: **Gemini
`gemini-embedding-2-preview`** (multimodal: PDF/imagen/audio/video, 768-d). Ver sección RAG
del [README](../README.md) y [database.md](database.md) (`rag_chunks`).

---

## Imágenes

Recursos cuyo JSON trae campos `prompt_imagen` disparan generación de imágenes en paralelo
(`backend/agents/images.py`): **Hugging Face FLUX.1-schnell** (`HF_TOKEN`). Límite por recurso:
`OVA_MAX_GENERATED_IMAGES` (default 2). Los placeholders `__IMG_1__`, `__IMG_2__`… se
reemplazan por data URIs (o un SVG placeholder si falla o `HF_TOKEN` no está configurado).

_Fuentes: `backend/agents/` (`engage_router.py`, `explore_router.py`, `llm_router.py`, `html_validator.py`, `engage_prompts.py`, `audio_helpers.py`, `images.py`)._
