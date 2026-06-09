# Pipeline 5E — Generación completa de OVAs

> Pipeline multiagente (Prometheus + LangGraph) que genera Objetos Virtuales de Aprendizaje
> aplicando las 5 fases del modelo instruccional 5E: Engage, Explore, Explain, Elaborate, Evaluate.
> 50 tipos de recurso en total, orquestados por un nodo Concierge que descompone el prompt del
> usuario y un grafo de 8 nodos que genera, valida y empaqueta cada recurso.

| Archivo | Rol |
|---|---|
| `backend/prometheus/graph.py` | Construcción del StateGraph (8 nodos + edges condicionales) |
| `backend/prometheus/state.py` | `OvaGenerationState` TypedDict compartido |
| `backend/prometheus/nodes/concierge.py` | Descomposición del prompt en plan de recursos por fase |
| `backend/prometheus/nodes/engage.py` — `evaluate.py` | Agentes de generación por fase (PEVR) |
| `backend/prometheus/nodes/validate.py` | Nodo de validación post-generación |
| `backend/prometheus/nodes/assemble.py` | Ensamblado final del OVA y SCORM |
| `backend/prometheus/plans/two_step.py` | Plan de generación en 2 pasos (texto → código) |
| `backend/prometheus/plans/direct_code.py` | Plan de generación directa (código en 1 paso) |
| `backend/prometheus/plans/podcast.py` | Plan de podcast (monólogo → TTS → HTML) |
| `backend/agents/engage_prompts.py` — `evaluate_prompts.py` | Prompts y metadatos de los 50 recursos |
| `backend/agents/html_validator.py` | Validación y auto-reparación de HTML generado |
| `backend/agents/utils.py` | Contexto compartido (`CURSO_CONTEXTO`, `DESIGN_SYSTEM`, `SCORM_JS`) |
| `backend/prometheus/checkpointer.py` | Persistencia de estado (PostgresSaver / MemorySaver) |

---

## Resumen

El pipeline recibe un `prompt` del usuario (tema, nivel, énfasis) y produce un OVA completo con
recursos HTML5 autocontenidos, validados y empaquetados en SCORM 1.2. La orquestación corre sobre
**LangGraph** (8 nodos, edges condicionales), con checkpointing en PostgreSQL para tolerancia a
fallos. Cada recurso se genera con LLMs reales (Groq + OpenRouter), usando uno de tres planes de
generación según el tipo de recurso.

---

## Arquitectura del grafo

```
┌──────────┐    ┌─────────┐    ┌──────────┐
│ Concierge │───→│ Engage  │───→│ Validate │
│ (plan)   │    └─────────┘    └────┬─────┘
└──────────┘         │              │ next_phase ─→ vuelve a Concierge
      │              │  ┌─────────┐ │ retry ──────→ misma fase
      │              └─→│ Explore │─┤ ok ─────────→ siguiente recurso
      │                 └─────────┘ │
      │                 ┌─────────┐ │
      ├────────────────→│ Explain │─┤
      │                 └─────────┘ │
      │                 ┌──────────┐│
      ├────────────────→│Elaborate │┤
      │                 └──────────┘│
      │                 ┌──────────┐│
      └────────────────→│ Evaluate │┘
                        └──────────┘
                              │
                              ▼
                        ┌──────────┐
                        │ Assemble │──→ END
                        └──────────┘
```

**8 nodos**: `concierge`, `engage`, `explore`, `explain`, `elaborate`, `evaluate`, `validate`,
`assemble`. El flujo es determinista: Concierge produce un plan, luego el grafo itera fase por
fase generando un recurso a la vez y pasando por validación tras cada uno.

---

## Modelo 5E y catálogo de recursos

Cada fase ofrece **10 tipos de recurso** (IDs 1–10), 50 en total. Cada recurso tiene metadatos
fijos en `RECURSOS_META`: `tipo`, `duracion`, `interactividad` (Alta/Media/Baja), `emoji` y el
plan de generación que le corresponde.

### ENGAGE — Enganchar al estudiante

| ID | Tipo | Duración | Interactividad | Plan |
|----|------|----------|----------------|------|
| 1 | 🎭 Cómic Interactivo | 1–2 min | Alta | two_step |
| 2 | 🎬 Storyboard de Video | 40 seg | Baja | two_step |
| 3 | 🎙️ Micro-Podcast | 45 seg | Baja | **podcast** |
| 4 | 🎮 Juego de Gamificación | 1–2 min | Alta | two_step |
| 5 | ⚖️ Dilema Ético | 2–3 min | Media | two_step |
| 6 | 📰 Noticia de Impacto | 1–2 min | Baja | two_step |
| 7 | 🎯 Juego de Roles | 2–3 min | Media | two_step |
| 8 | 📅 Timeline Interactivo | 2–3 min | Media | two_step |
| 9 | 🔐 Escape Room Virtual | 3–4 min | Alta | two_step |
| 10 | 🎛️ Simulador Intuitivo | 2–3 min | Alta | **direct_code** |

**Archivo**: `backend/agents/engage_prompts.py`  
**Funciones**: `prompt_texto(n, concept, ctx)`, `prompt_simulador(concept, ctx)` (recurso 10),
`prompt_html(n, concept, data_json, ctx)`.  
El recurso 3 usa `podcast_gen` (no `direct_code_gen`), el 10 usa `direct_code_gen`, los demás
usan `two_step_gen`.

### EXPLORE — Explorar en profundidad

| ID | Tipo | Duración | Interactividad | Plan |
|----|------|----------|----------------|------|
| 1 | 🧪 Simulador Virtual Lab | 3–4 min | Alta | **direct_code** |
| 2 | 🤔 Agente Socrático | 5–6 min | Alta | two_step |
| 3 | 🎮 Juego Drag & Drop | 2–3 min | Media | two_step |
| 4 | 🎬 Video con Pausa Activa | 2–3 min | Media | two_step |
| 5 | 📖 Lectura Interactiva | 3–4 min | Media | two_step |
| 6 | 🎛️ Simulador de Slider | 4–5 min | Alta | **direct_code** |
| 7 | 🔬 Experimento Guiado | 5–6 min | Media | two_step |
| 8 | 🎭 Juego de Roles | 4–5 min | Media | two_step |
| 9 | 🗺️ Mapa Mental | 5–6 min | Alta | two_step |
| 10 | 💡 Lab de Hipótesis | 5–7 min | Alta | **direct_code** |

**Archivo**: `backend/agents/explore_prompts.py`  
**Funciones**: `prompt_codigo(n, concept, ctx)` (para 1,6,10), `prompt_texto(n, concept, ctx)`,
`prompt_html(n, concept, data_json, ctx)`.  
`CODE_ONLY = {1, 6, 10}` → usan `direct_code_gen`.

### EXPLAIN — Explicar la teoría

| ID | Tipo | Duración | Interactividad | Plan |
|----|------|----------|----------------|------|
| 1 | 🎥 Video Teórico | 2–3 min | Baja | two_step |
| 2 | 📖 Lectura Guiada | 4–5 min | Baja | two_step |
| 3 | 🗺️ Mapa Conceptual | 1–2 min | Alta | **direct_code** |
| 4 | ❓ FAQ Interactivo | 2–3 min | Media | two_step |
| 5 | ✨ Demo Animada | 1–2 min | Alta | **direct_code** |
| 6 | 📝 Glosario Visual | 2–3 min | Media | two_step |
| 7 | ⏳ Línea de Tiempo | 2–3 min | Media | two_step |
| 8 | 🧩 Diagrama de Framework | 1–2 min | Alta | **direct_code** |
| 9 | 📊 Tabla Comparativa | 2–3 min | Media | two_step |
| 10 | 🎨 Infografía Interactiva | 2–3 min | Alta | **direct_code** |

**Archivo**: `backend/agents/explain_prompts.py`  
`CODE_ONLY = {3, 5, 8, 10}` → usan `direct_code_gen`.

### ELABORATE — Aplicar y practicar

| ID | Tipo | Duración | Interactividad | Plan |
|----|------|----------|----------------|------|
| 1 | 📋 Estudio de Caso | 4–5 min | Media | two_step |
| 2 | ✏️ Ejercicio Guiado | 5–6 min | Media | two_step |
| 3 | 🛠️ Mini-Proyecto | 8–10 min | Alta | two_step |
| 4 | 🔬 Simulación Aplicada | 3–4 min | Alta | **direct_code** |
| 5 | 📈 Análisis de Datos | 4–5 min | Alta | **direct_code** |
| 6 | 🌳 Escenario Ramificado | 3–4 min | Media | two_step |
| 7 | 💻 Lab de Código | 5–7 min | Alta | **direct_code** |
| 8 | 🧭 Mapa de Problemas | 3–4 min | Media | two_step |
| 9 | ♟️ Juego de Estrategia | 4–5 min | Alta | **direct_code** |
| 10 | 🏗️ Reto de Diseño | 6–8 min | Media | two_step |

**Archivo**: `backend/agents/elaborate_prompts.py`  
`CODE_ONLY = {4, 5, 7, 9}` → usan `direct_code_gen`.

### EVALUATE — Evaluar el aprendizaje

| ID | Tipo | Duración | Interactividad | Plan |
|----|------|----------|----------------|------|
| 1 | ❓ Quiz Interactivo | 2–3 min | Media | two_step |
| 2 | 📋 Rúbrica de Autoevaluación | 2–3 min | Media | two_step |
| 3 | ⏱️ Desafío Contrarreloj | 2–3 min | Alta | **direct_code** |
| 4 | 📝 Examen Opción Múltiple | 3–4 min | Media | two_step |
| 5 | ✍️ Completar Espacios | 2–3 min | Alta | **direct_code** |
| 6 | 🔗 Relacionar Conceptos | 2–3 min | Media | two_step |
| 7 | 🧩 Crucigrama Conceptual | 3–4 min | Media | two_step |
| 8 | 💬 Preguntas de Desarrollo | 4–5 min | Baja | two_step |
| 9 | 🎯 Simulación Evaluativa | 3–4 min | Alta | **direct_code** |
| 10 | 🏆 Diploma de Logro | 1–2 min | Baja | two_step |

**Archivo**: `backend/agents/evaluate_prompts.py`  
`CODE_ONLY = {3, 5, 9}` → usan `direct_code_gen`.

---

## Nodo Concierge — Selección de recursos

`backend/prometheus/nodes/concierge.py` — `concierge_node(state)`

1. Recibe el `prompt` del usuario desde el estado.
2. Invoca el LLM con la tarea **`orquestador`** (`openai/gpt-oss-120b`, `reasoning_effort: medium`)
   pasándole el catálogo completo de 50 recursos como system prompt.
3. El LLM devuelve un JSON `{engage: [ids], explore: [ids], explain: [ids], elaborate: [ids], evaluate: [ids]}`
   con 2–4 IDs por fase, adaptados al tema/nivel/énfasis.
4. Si el LLM falla (rate-limit, timeout, JSON inválido) → **FALLBACK_PLAN** determinista:

| Fase | Recursos |
|------|----------|
| Engage | 1, 5, 7, 10 |
| Explore | 1, 4, 7, 9 |
| Explain | 2, 3, 6, 8 |
| Elaborate | 1, 4, 7, 9 |
| Evaluate | 1, 4, 6, 8 |

El Concierge solo se ejecuta una vez al inicio. Si el estado ya tiene `phases`, es un reingreso
(después de completar una fase) y no reejecuta la descomposición.

---

## Los 3 planes de generación

Cada recurso se asigna a uno de tres planes según su tipo y fase. Los planes residen en
`backend/prometheus/plans/` y son agnósticos de fase (despachan al módulo de prompts correcto).

### `two_step_gen` — Generación en 2 pasos

Usado por ~70% de los recursos (~35 de 50).

```
prompt_texto(n, concept, ctx) → LLM "texto" (3K tokens)
   │
   ▼
parse_json(raw) → JSON estructurado (guion, rondas, preguntas, etc.)
   │
   ▼
prompt_html(n, concept, json_str, ctx) → LLM "codigo" (12K tokens)
   │
   ▼
strip_markdown(html) → validate_and_repair(html, phase, n)
   │
   ▼
HTML final autocontenido
```

- **Paso 1**: el LLM de texto (`llama-3.3-70b-versatile` en Groq) genera contenido estructurado
  en JSON (guiones, datasets, preguntas, rondas…).
- **Paso 2**: el JSON se inyecta en un prompt de código que el LLM de código
  (`deepseek/deepseek-v4-flash` en OpenRouter) transforma en HTML5 interactivo.
- Si el JSON no parsea, se usa el texto crudo como fallback (`{"contenido": raw}`).

### `direct_code_gen` — Generación directa de código

Usado para recursos puramente visuales/interactivos que no necesitan contenido textual
estructurado previo: simuladores, demos animadas, diagramas, mapas conceptuales.

```
prompt_codigo(n, concept, ctx) → LLM "codigo" (12K tokens)
   │
   ▼
strip_markdown(html) → validate_and_repair(html, phase, n)
   │
   ▼
HTML final autocontenido
```

El LLM recibe instrucciones detalladas de formato, mecánica y diseño directamente en el prompt
de código, sin paso intermedio de JSON.

### `podcast_gen` — Podcast con TTS

Usado **exclusivamente** para ENGAGE recurso 3 (Micro-Podcast).

```
prompt_texto(3, concept, "") → LLM "texto" (700 tokens)
   │
   ▼
monólogo en primera persona (100–120 palabras)
   │
   ▼
podcast_audio_b64(mono) → Groq TTS → WAV base64
   │
   ▼
build_podcast_html(concept, mono, audio_b64)
   │
   ▼
HTML con reproductor de audio embebido + SCORM
```

- El LLM produce un monólogo donde el narrador **es** el concepto hablando en primera persona.
- `backend/agents/podcast.py` sintetiza el audio con **Groq TTS** (`generar_audio_tts`) y
  construye un reproductor HTML5 oscuro con visualizador de onda CSS animado.
- Si el TTS falla, se degrada a texto con botón "He terminado de leer".

---

## Ciclo PEVR (Perceive → Evaluate → Verify → Respond)

Cada nodo de fase (`engage_node`, `explore_node`, …) implementa el ciclo PEVR del diseño
arquitectónico Prometheus. La **V** (Verify) ocurre en un nodo separado (`validate_node`)
conectado por edges condicionales.

### Perceive
El estado `rag_context` (poblado por herramientas RAG antes de invocar el grafo) se inyecta en
cada prompt vía `format_contexto_usuario()`. Si el usuario subió archivos, el contexto recuperado
de la BD vectorial ancla la generación al material de estudio.

### Evaluate
Cada nodo de fase evalúa el `resource_type` y selecciona el plan:
- **ENGAGE**: `rt == 3` → `podcast_gen`, `rt == 10` → `direct_code_gen`, resto → `two_step_gen`
- **EXPLORE**: `rt in {1, 6, 10}` → `direct_code_gen`, resto → `two_step_gen`
- **EXPLAIN**: `rt in {3, 5, 8, 10}` → `direct_code_gen`, resto → `two_step_gen`
- **ELABORATE**: `rt in {4, 5, 7, 9}` → `direct_code_gen`, resto → `two_step_gen`
- **EVALUATE**: `rt in {3, 5, 9}` → `direct_code_gen`, resto → `two_step_gen`

### Verify
El nodo `validate_node` recibe el HTML generado, la fase y el `resource_type`, y llama a
`validate_and_repair()`. El resultado (`valid: bool`) determina el routing condicional:
- `True` → siguiente recurso de la misma fase, o cambio a la siguiente fase si se completaron todos.
- `False` → se reintenta el mismo recurso (el error se acumula en `state.errors`).

### Respond
El plan de generación invoca `generar_texto()` del `llm_router`, que enruta al proveedor
primario (Groq u OpenRouter) y aplica cadena de fallback ante errores recuperables
(rate-limit, 402 sin crédito, 5xx, respuesta vacía).

---

## Flujo del grafo (LangGraph)

### Construcción
`backend/prometheus/graph.py` — `build_ova_graph()`:

1. **8 nodos** registrados en un `StateGraph(OvaGenerationState)`.
2. **Entry point**: `concierge`.
3. **Edge condicional desde Concierge**: `_route_next_phase` → dirige a la primera fase del
   `phase_order`, o a `assemble` si no hay fases.
4. **Cada fase → validate**: edge fijo.
5. **Edge condicional desde validate**: `_check_validation` → decide entre:
   - `"engage"` / `"explore"` / … — misma fase, siguiente recurso
   - `"next_phase"` — vuelve a `concierge`, que avanza `current_phase_idx` y resetea
     `current_resource_idx`
   - `"assemble"` — todas las fases completadas
6. **assemble → END**: edge fijo.

### Invocación
`invoke_ova_generation(initial_state, thread_id, checkpointer)`:
- Compila el grafo con un `PostgresSaver` (o `MemorySaver` en dev/local).
- Usa `thread_id = job_id` para checkpointing.
- Invoca con `config = {"configurable": {"thread_id": thread_id}}`.

### Routing condicional

`_route_next_phase(state)`:
- Lee `phase_order[idx]`. Si `idx < len(phase_order)` → devuelve el nombre de la fase. Si no → `"assemble"`.

`_check_validation(state)`:
- Si el último recurso falló y no hay resultados → avanza a `next_phase` o `assemble`.
- Si `done >= total_resources` → `next_phase`.
- Si no → reintenta la misma fase (el `current_resource_idx` ya se incrementó en el nodo de fase).

### Una invocación = un recurso

Cada nodo de fase genera **exactamente un recurso** por invocación. El grafo itera:
1. Entra a la fase con `current_resource_idx = 0`.
2. Genera recurso `resources[idx]`, incrementa `current_resource_idx`.
3. Pasa por `validate`.
4. Si `idx < len(resources)` → vuelve a la misma fase.
5. Si `idx == len(resources)` → `next_phase` → `concierge` avanza `current_phase_idx`.

---

## Validación y auto-reparación de HTML

`backend/agents/html_validator.py` — `validate_and_repair(html, phase, resource_type)`

### Checks de validación (`validate_html`)

| Categoría | Checks |
|---|---|
| **Estructura** | `<!DOCTYPE html>` presente, `</html>` presente (detecta truncado), `<script>` sin cerrar |
| **SCORM** | `_scormInit`, `_scormComplete`, `cmi.core.lesson_status` presentes |
| **Longitud mínima** | Umbrales por `(fase, tipo)` — ej. ENGAGE cómic ≥3000 chars, EXPLORE lab ≥4000 chars. Default 2000. |
| **CDN prohibidos** | `jsdelivr`, `cdnjs.cloudflare`, `unpkg`, `jquery`, `bootstrapcdn`, `googleapis`, `maxcdn` |

### Auto-reparación (`repair_truncated_html`)

Si alguna validación falla, se intenta reparar:
1. Cierra `<script>` abierto sin `</script>`.
2. Inyecta el bloque SCORM (`_scormInit`, `_scormComplete`, `cmi.core.lesson_status`) antes de `</body>`.
3. Cierra `</body>` y `</html>` faltantes.

La función devuelve `(html_reparado, fallas_restantes)`. Si quedan fallas tras la reparación,
el HTML se entrega igual (best-effort), pero se registra warning con las fallas pendientes.
**Nunca se bloquea la entrega al cliente.**

---

## Contexto compartido en prompts

`backend/agents/utils.py` inyecta tres bloques fijos en **todos** los prompts de generación:

### `CURSO_CONTEXTO`
Define la audiencia y alcance: curso universitario de Machine Learning, primer contacto,
sin formación matemática avanzada, idioma español, contenido pedagógicamente sólido y fiel
al concepto indicado.

### `DESIGN_SYSTEM`
Sistema de diseño obligatorio (~80 líneas) con 8 secciones no negociables:
1. **Base técnica**: `<!DOCTYPE html>`, `lang="es"`, viewport, reset CSS, font stack del sistema,
   variables CSS en `:root`, sin dependencias externas.
2. **Paleta**: clara u oscura con variables (`--bg`, `--surface`, `--primary`, `--text`, etc.),
   contraste WCAG AA.
3. **Tipografía**: `clamp()` para responsive, `line-height ≥ 1.5`, headings con `font-weight: 700`.
4. **Layout**: mobile-first, `max-width: 880px`, espaciado consistente (8/12/16/24/32/48 px),
   grid/flex con `gap`, cards con `border-radius: 12–16px` y shadow sutil.
5. **Interacción**: botones con padding 12px 20px, `transition: 200ms ease`, `:hover translateY(-1px)`,
   `:focus-visible outline 3px`, estados visualmente distintos.
6. **Accesibilidad**: contraste ≥4.5:1, focus visible, `aria-label`, `prefers-reduced-motion`.
7. **Calidad**: JS funcional real, `addEventListener` (no inline `onclick=`), drag & drop con
   `draggable="true"`, SVG real con `viewBox`, grid con `minmax`, prohibido `width > 320px` sin clamp.
8. **Prohibido**: lorem ipsum, imágenes externas, librerías JS/CSS externas, comentarios >30 chars,
   múltiples `<h1>`, `position:fixed` que tape contenido.

### `SCORM_JS`
Snippet JavaScript inline que implementa los callbacks SCORM 1.2:
```js
function _scormInit(){if(window.API)window.API.LMSInitialize("")}
function _scormComplete(s){if(window.API){
  if(s!=null)window.API.LMSSetValue("cmi.core.score.raw",s);
  window.API.LMSSetValue("cmi.core.lesson_status","completed");
  window.API.LMSCommit("");window.API.LMSFinish("")}}
window.addEventListener("load",_scormInit)
```

### `format_contexto_usuario(ctx)`
Si hay contexto RAG recuperado de archivos subidos por el usuario, lo envuelve en un bloque
`[CONTEXTO_APORTADO_POR_EL_USUARIO]` y lo concatena al prompt. Si no hay contexto, devuelve `""`.

---

## Enrutado de LLM y fallback

`backend/agents/llm_router.py` — `generar_texto(prompt, tarea, max_tokens)`.

Cada **tarea** tiene un modelo primario y una cadena de respaldo que se recorre ante errores
recuperables (rate-limit, `APIStatusError`, `EmptyContentError`):

| Tarea | Modelo primario | Proveedor | Tokens típicos |
|---|---|---|---|
| `texto` | `llama-3.3-70b-versatile` | Groq | 3K (two_step), 700 (podcast) |
| `codigo` | `deepseek/deepseek-v4-flash` | OpenRouter | 12K |
| `orquestador` | `openai/gpt-oss-120b` | Groq | 800 |
| `razonamiento` | `qwen/qwen3-32b` | Groq | — |

**Cadenas de fallback** (recorridas con backoff exponencial, máx 8 s):
- `codigo`: DeepSeek V4 Flash (paid) → `qwen3-coder:free` → Llama 3.3 70B (OR free) → Llama 3.3 70B (Groq)
- `texto`: `llama-3.1-8b-instant` (Groq) → Llama 3.3 70B (OR free)
- `orquestador`: `qwen3-32b` (Groq) → `llama-3.1-8b-instant`
- `razonamiento`: `gpt-oss-120b` (`effort: low`) → `llama-3.1-8b-instant`

Timeout por llamada: `LLM_TIMEOUT_S` (default 120 s).

---

## Checkpointing

`backend/prometheus/checkpointer.py` — `get_checkpointer()`:
- Si `DATABASE_URL` está configurada → `PostgresSaver` sobre Supabase PostgreSQL.
- Si no → `MemorySaver` (desarrollo / tests).
- El `thread_id` de LangGraph se iguala al `job_id` de la generación, permitiendo reanudar
  trabajos interrumpidos.

---

## Ensamblado final

`backend/prometheus/nodes/assemble.py` — `assemble_node(state)`:
- Lee `state.results` (lista de `{phase, html, resource_type, title}`).
- Construye `phases_data` con `type`, `order`, `content`, `title`.
- Marca `ova_status = "listo"` y retorna `scorm_zip_path` (el empaquetado SCORM real ocurre en
  una capa superior que consume el estado final del grafo).

---

## Ver también

- [Labs — Iteración de prompts](labs.md) — Sandbox para probar y mejorar prompts de cada recurso.
- [API Reference](api.md) — Endpoints REST del pipeline (`POST /api/ova/generate`, etc.).
- [Database](database.md) — Esquema de tablas relacionadas (`ovas`, `ova_phases`, `rag_chunks`).

---

*Fuentes: `backend/prometheus/` (graph, state, nodes, plans, checkpointer),
`backend/agents/` (engage_prompts — evaluate_prompts, llm_router, html_validator, utils, podcast).*
