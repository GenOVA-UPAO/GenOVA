# Pipeline de generación (metodología 5E)

GenOVA genera Objetos Virtuales de Aprendizaje (OVA) aplicando la metodología **5E** completa:
**Engage, Explore, Explain, Elaborate, Evaluate**. Cada fase ofrece **10 tipos de recurso**
(50 en total); el usuario elige hasta 4 por fase y el backend los genera con LLMs reales, valida
el HTML y empaqueta todo en un paquete SCORM 1.2.

El formato de cada recurso está fijo en el prompt, pero **todo el contenido se adapta al
`concept`** que el usuario describe.

> Este documento es un resumen. La referencia canónica está en:
> - [prometheus.md](prometheus.md) — arquitectura del motor (grafo LangGraph, paralelismo, persistencia)
> - [fases-5e.md](fases-5e.md) — catálogo de los 50 recursos + plantillas de prompt por fase
> - [catalogo-modelos.md](catalogo-modelos.md) — modelos LLM, asignación por tarea y fallback

---

## Cómo se genera (resumen)

La generación corre **en background** como un job (`POST /api/ova/jobs` → `run_job` en un thread;
ver [api.md](api.md) y [workspace.md](workspace.md)), no en una llamada síncrona. El motor
Prometheus (`backend/prometheus/`, sobre LangGraph) ejecuta un grafo de **7 nodos**: `concierge`
(plan) → 5 nodos de fase → `assemble`. Cada nodo de fase genera **todos** sus recursos en
**paralelo acotado** (`OVA_GEN_CONCURRENCY`, default 4) y persiste cada uno a su fila
`OvaJobResource` al terminar, de modo que el progreso del front es real.

Cada recurso usa uno de **tres planes** (`backend/prometheus/plans/`):
- **two_step** (~70%): LLM `texto` → JSON estructurado → LLM `codigo` → HTML.
- **direct_code**: una sola llamada LLM `codigo` → HTML (simuladores, diagramas, demos).
- **podcast** (ENGAGE recurso 3): monólogo → TTS de Groq (`backend/llm/podcast.py`) → reproductor HTML.

Tras generar, cada recurso pasa por `validate_and_repair` (determinista) y `maybe_refine`
(crítico LLM opcional de una pasada). Detalle en [prometheus.md](prometheus.md).

---

## Enrutado de LLM y fallback

`backend/llm/router.py` → `generar_texto(prompt, tarea, max_tokens, llm_config, enabled_models)`.
Cada **tarea** (`texto`, `codigo`, `orquestador`, `razonamiento`) tiene un modelo primario y una
cadena de respaldo que se recorre con backoff exponencial ante errores recuperables (rate-limit,
`APIStatusError` incluido 402/5xx, `EmptyContentError`). Tabla completa de modelos y cadenas en
[catalogo-modelos.md](catalogo-modelos.md).

---

## Validación y auto-reparación de HTML

`backend/llm/html_validator.py` revisa cada HTML: `<!DOCTYPE html>`, cierres `</html>`/`</script>`
(truncado), callbacks SCORM (`_scormInit`, `_scormComplete`, `cmi.core.lesson_status`), longitud
mínima por `(fase, tipo)` y ausencia de CDNs externos. Auto-repara cierres faltantes e inyecta
SCORM antes de `</body>`. **Nunca bloquea** la entrega.

---

## RAG (contexto desde archivos del usuario)

Si el usuario sube archivos y pasa sus `upload_ids` al generar, el pipeline recupera los top-K
chunks (`backend/rag/`) y los inyecta en los prompts para anclar la generación. Embedder por
defecto: **Gemini `gemini-embedding-2-preview`** (multimodal, 768-d). Ver [database.md](database.md)
(`rag_chunks`).

---

## Imágenes

Recursos cuyo JSON trae campos `prompt_imagen` disparan generación de imágenes en paralelo
(`backend/llm/image_providers.py`, vía `enrich_with_images`). El proveedor y el límite por recurso
se configuran en `image_settings` del job. Los placeholders `__IMG_1__`, `__IMG_2__`… se reemplazan
por data URIs (o un SVG placeholder si falla).
