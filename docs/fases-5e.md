# Pipeline 5E — Generación completa de OVAs

> Catálogo de los **50 tipos de recurso** (10 por fase 5E: Engage, Explore, Explain, Elaborate,
> Evaluate) y las plantillas de prompt con que se generan. La **arquitectura del motor** (grafo
> LangGraph de 7 nodos, paralelismo, persistencia, planes) vive en [prometheus.md](prometheus.md);
> este documento se centra en el catálogo y los prompts.

| Archivo | Rol |
|---|---|
| `backend/prometheus/nodes/concierge.py` | Descomposición del prompt en plan de recursos por fase |
| `backend/prometheus/prompts/engage_prompts.py` … `evaluate_prompts.py` | Prompts y metadatos (`RECURSOS_META`) de los 50 recursos |
| `backend/prometheus/plans/two_step.py` | Plan de generación en 2 pasos (texto → código) |
| `backend/prometheus/plans/direct_code.py` | Plan de generación directa (código en 1 paso) |
| `backend/prometheus/plans/podcast.py` | Despacho del plan podcast (monólogo) |
| `backend/llm/podcast.py` | TTS de Groq + reproductor HTML del podcast |
| `backend/llm/html_validator.py` | Validación y auto-reparación de HTML generado |
| `backend/llm/utils.py` | Contexto compartido (`CURSO_CONTEXTO`, `DESIGN_SYSTEM`, `SCORM_JS`) |
| `backend/llm/router.py` | Enrutado de LLM por tarea + cadenas de fallback |

---

## Resumen

El pipeline recibe un `prompt` del usuario y produce un OVA completo con recursos HTML5
autocontenidos, validados y empaquetados en SCORM 1.2. La orquestación corre sobre **LangGraph**:
un grafo de **7 nodos** (`concierge` + 5 fases + `assemble`) donde cada nodo de fase genera
**todos** sus recursos en paralelo acotado. Cada recurso se genera con LLMs reales (Groq +
OpenRouter) usando uno de tres planes según el tipo. Detalle completo del flujo en
[prometheus.md](prometheus.md).

---

## Arquitectura del grafo

```
START → concierge → [engage → explore → explain → elaborate → evaluate] → assemble → END
```

**7 nodos**: `concierge`, `engage`, `explore`, `explain`, `elaborate`, `evaluate`, `assemble`.
No hay nodo `validate`: la validación/reparación y el refine ocurren **dentro** de cada plan de
generación. Cada nodo de fase genera **todos** los recursos de su fase en paralelo acotado
(`run_phase`), no uno a uno. Ver [prometheus.md](prometheus.md#arquitectura-del-grafo).

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

**Archivo**: `backend/prometheus/prompts/engage_prompts.py`  
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

**Archivo**: `backend/prometheus/prompts/explore_prompts.py`  
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

**Archivo**: `backend/prometheus/prompts/explain_prompts.py`  
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

**Archivo**: `backend/prometheus/prompts/elaborate_prompts.py`  
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

**Archivo**: `backend/prometheus/prompts/evaluate_prompts.py`  
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
- `backend/llm/podcast.py` sintetiza el audio con **Groq TTS** (`generar_audio_tts`) y
  construye un reproductor HTML5 oscuro con visualizador de onda CSS animado.
- Si el TTS falla, se degrada a texto con botón "He terminado de leer".

---

## Selección de plan por fase

Cada nodo de fase elige el plan según el `resource_type` (tabla `_dispatch`):
- **ENGAGE**: `rt == 3` → `podcast_gen`, `rt == 10` → `direct_code_gen`, resto → `two_step_gen`
- **EXPLORE**: `rt in {1, 6, 10}` → `direct_code_gen`, resto → `two_step_gen`
- **EXPLAIN**: `rt in {3, 5, 8, 10}` → `direct_code_gen`, resto → `two_step_gen`
- **ELABORATE**: `rt in {4, 5, 7, 9}` → `direct_code_gen`, resto → `two_step_gen`
- **EVALUATE**: `rt in {3, 5, 9}` → `direct_code_gen`, resto → `two_step_gen`

El contexto RAG (`rag_context`, si hay `upload_ids`) se inyecta en los prompts vía
`format_contexto_usuario()`. La validación/reparación y el refine ocurren **dentro del plan**, no
como nodos. El flujo del grafo (router determinista, generación paralela por fase, persistencia
incremental, checkpointing) está documentado en [prometheus.md](prometheus.md).

---

## Validación y auto-reparación de HTML

`backend/llm/html_validator.py` — `validate_and_repair(html, phase, resource_type)`

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

`backend/llm/utils.py` inyecta tres bloques fijos en **todos** los prompts de generación:

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

`backend/llm/router.py` — `generar_texto(prompt, tarea, max_tokens)`.

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

`backend/prometheus/checkpointer.py` — `get_checkpointer()`: **`MemorySaver` por defecto** (a
propósito). El progreso real se persiste a nivel `OvaJobResource`, no en checkpoints del grafo; la
reanudación re-invoca el grafo y salta las filas ya `done`. `PostgresSaver` es **opt-in** con
`OVA_PG_CHECKPOINT=1`. Motivos en [prometheus.md](prometheus.md#checkpointing).

---

## Ensamblado final

`backend/prometheus/nodes/assemble.py` — `assemble_node(state)`:
- Lee `state.results` (lista de `{phase, html, resource_type, title}`).
- Construye `phases_data` con `type`, `order`, `content`, `title`.
- Marca `ova_status = "listo"` y retorna `scorm_zip_path` (el empaquetado SCORM real ocurre en
  una capa superior que consume el estado final del grafo).

---

## Prompts de generación — ENGAGE

Plantillas exactas de `backend/prometheus/prompts/engage_prompts.py`. Cada `{concept}` es el placeholder
del concepto de ML; los recursos two_step usan `prompt_texto` (paso 1) + `prompt_html` (paso 2);
el recurso 3 es podcast (solo `prompt_texto`) y el 10 es direct_code (solo `prompt_simulador`).
`prompt_html` comparte cuerpo entre recursos: solo cambia el `[FORMATO]` por recurso.

### Recurso 1 — 🎭 Cómic Interactivo (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Guionista de cómics educativos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Guion de 5 viñetas con el robot "Max" que enganche al estudiante con "{concept}". Elige una analogía cotidiana concreta que capture fielmente la idea central de "{concept}" y construye una historia con progresión hacia un clímax que despierte curiosidad. Cada viñeta: descripcion_visual (≤25 palabras), dialogo (≤18 palabras), prompt_imagen (en inglés, estilo cartoon plano).
[RESTRICCIONES] Sin jerga técnica en los diálogos. Humor empático. La analogía debe reflejar de verdad cómo funciona "{concept}".
[SALIDA] JSON puro sin markdown: array de 5 objetos con claves "numero","descripcion_visual","dialogo","prompt_imagen".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[ROL] Guionista de cómics educativos.
[CURSO] Recurso para un curso universitario de Machine Learning. Audiencia: estudiantes en su primer contacto con el tema, sin formación matemática avanzada. Idioma: español. El recurso debe ser pedagógicamente sólido y técnicamente correcto, pero con lenguaje accesible. Todo ejemplo, dato, analogía o mecánica debe ser específico y fiel al concepto de ML indicado — nunca genérico ni de otro subtema.
[CONCEPTO] "Regresión Lineal"
[TAREA] Guion de 5 viñetas con el robot "Max" que enganche al estudiante con "Regresión Lineal". Elige una analogía cotidiana concreta que capture fielmente la idea central de "Regresión Lineal" y construye una historia con progresión hacia un clímax que despierte curiosidad. Cada viñeta: descripcion_visual (≤25 palabras), dialogo (≤18 palabras), prompt_imagen (en inglés, estilo cartoon plano).
[RESTRICCIONES] Sin jerga técnica en los diálogos. Humor empático. La analogía debe reflejar de verdad cómo funciona "Regresión Lineal".
[SALIDA] JSON puro sin markdown: array de 5 objetos con claves "numero","descripcion_visual","dialogo","prompt_imagen".
```

#### Paso 2: prompt_html

```text
[ROL] Desarrollador front-end experto en recursos educativos interactivos.
[CURSO] {CURSO_CONTEXTO}
[OBJETIVO] Construir un recurso HTML5 interactivo de la fase ENGAGE sobre "{concept}" que enganche al estudiante.
[DATOS] Usa exactamente este contenido, sin inventar ni omitir datos:
{data_json}
[FORMATO] galería deslizable tipo cómic: tarjetas grandes de colores, bocadillos CSS, navegación prev/next con indicador de progreso
[REQUISITOS]
- HTML5 autocontenido: todo el CSS en <style>, todo el JS en <script>.
- Mínimo 280 líneas de calidad. Cada elemento debe ser funcional (navegación, botones, feedback, puntuación).
- Paleta apropiada al tipo: cómic (clara vibrante), noticia (clara periodística), escape-room (oscura dramática),
  podcast (oscura íntima), timeline (clara académica), juegos (clara con acentos).
[SISTEMA_DE_DISEÑO_OBLIGATORIO] ← ver sección "Contexto compartido en prompts"
[IMAGENES] Si un item de los datos incluye un campo "image_placeholder" (por ejemplo "__IMG_1__"), úsalo literalmente como src del tag <img> correspondiente (por ejemplo: <img src="__IMG_1__" alt="...">). Si un item NO tiene "image_placeholder", NO inventes uno y NO incluyas <img> para ese item — renderiza solo texto. El servidor reemplaza los placeholders válidos por imágenes reales al renderizar.
[SCORM] ← ver sección "Contexto compartido en prompts". Llama _scormComplete() al completar la actividad principal.
[SALIDA] Solo el documento HTML completo desde <!DOCTYPE html>, sin markdown.
```

**Ejemplo completado** (`data_json` = salida simplificada del paso 1):

```text
[ROL] Desarrollador front-end experto en recursos educativos interactivos.
[CURSO] Recurso para un curso universitario de Machine Learning. Audiencia: estudiantes en su primer contacto con el tema, sin formación matemática avanzada. Idioma: español. El recurso debe ser pedagógicamente sólido y técnicamente correcto, pero con lenguaje accesible. Todo ejemplo, dato, analogía o mecánica debe ser específico y fiel al concepto de ML indicado — nunca genérico ni de otro subtema.
[OBJETIVO] Construir un recurso HTML5 interactivo de la fase ENGAGE sobre "Regresión Lineal" que enganche al estudiante.
[DATOS] Usa exactamente este contenido, sin inventar ni omitir datos:
[
  {"numero": 1, "descripcion_visual": "Max observa una pizarra con puntos dispersos del precio de casas según su tamaño.", "dialogo": "¿Y si pudiera trazar UNA línea que adivine el precio?", "prompt_imagen": "flat cartoon robot looking at scatter plot on blackboard"},
  {"numero": 2, "descripcion_visual": "Max dibuja una recta que atraviesa la nube de puntos minimizando las distancias.", "dialogo": "¡La mejor recta es la que pasa más cerca de todos!", "prompt_imagen": "flat cartoon robot drawing a best-fit line through dots"}
]
[FORMATO] galería deslizable tipo cómic: tarjetas grandes de colores, bocadillos CSS, navegación prev/next con indicador de progreso
[REQUISITOS]
- HTML5 autocontenido: todo el CSS en <style>, todo el JS en <script>.
- Mínimo 280 líneas de calidad. Cada elemento debe ser funcional (navegación, botones, feedback, puntuación).
- Paleta apropiada al tipo: cómic (clara vibrante), noticia (clara periodística), escape-room (oscura dramática),
  podcast (oscura íntima), timeline (clara académica), juegos (clara con acentos).
[SISTEMA_DE_DISEÑO_OBLIGATORIO] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS)
[IMAGENES] Si un item de los datos incluye un campo "image_placeholder"... (idéntico a la plantilla)
[SCORM] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS). Llama _scormComplete() al completar la actividad principal.
[SALIDA] Solo el documento HTML completo desde <!DOCTYPE html>, sin markdown.
```

### Recurso 2 — 🎬 Storyboard de Video (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Guionista audiovisual de EdTech.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Video de apertura de 40 s sobre "{concept}". Genera: guion_visual con marcadores de tiempo cada 10 s y metáforas cotidianas apropiadas al tema; narracion_voz ≤70 palabras que cierra con una pregunta abierta; prompt_video en inglés ≤90 palabras para un generador de video.
[RESTRICCIONES] Sin términos técnicos en guion ni narración. Tono cinematográfico.
[SALIDA] JSON puro sin markdown con claves "guion_visual","narracion_voz","prompt_video".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[ROL] Guionista audiovisual de EdTech.
[CURSO] Recurso para un curso universitario de Machine Learning… (ver utils.py CURSO_CONTEXTO)
[CONCEPTO] "Regresión Lineal"
[TAREA] Video de apertura de 40 s sobre "Regresión Lineal". Genera: guion_visual con marcadores de tiempo cada 10 s y metáforas cotidianas apropiadas al tema; narracion_voz ≤70 palabras que cierra con una pregunta abierta; prompt_video en inglés ≤90 palabras para un generador de video.
[RESTRICCIONES] Sin términos técnicos en guion ni narración. Tono cinematográfico.
[SALIDA] JSON puro sin markdown con claves "guion_visual","narracion_voz","prompt_video".
```

#### Paso 2: prompt_html

Cuerpo idéntico al de los demás two_step de ENGAGE; solo cambia el `[FORMATO]`:

```text
[FORMATO] storyboard vertical con marcadores de tiempo, narración en bloque de cita, prompt de video en una caja copiable
```

**Ejemplo completado** (`data_json`):

```text
{
  "guion_visual": "0s: ciudad al amanecer · 10s: zoom a un mapa de precios · 20s: aparece una línea que une los datos · 30s: pregunta en pantalla",
  "narracion_voz": "Cada mañana decidimos sin darnos cuenta: si llueve, salgo antes. ¿Y si una sola línea pudiera predecir el futuro a partir del pasado?",
  "prompt_video": "cinematic city sunrise, data points fading in over a map, a glowing straight line connecting them, hopeful tone"
}
```
(El resto del prompt es idéntico al ejemplo del Recurso 1, con `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 3 — 🎙️ Micro-Podcast (podcast)

#### prompt_texto (único paso)

```text
[ROL] Productor de micro-podcasts educativos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Monólogo narrativo de 100-120 palabras donde el narrador ES "{concept}" hablando en primera persona. Estructura: situación → tensión → pregunta abierta final. Apóyate en una imagen mental concreta y fiel al tema.
[RESTRICCIONES] Sin matemática abstracta. Tono íntimo y reflexivo. Puntuación clara para pausas de lectura por voz.
[SALIDA] Solo el texto del monólogo en español, sin etiquetas ni JSON.
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[ROL] Productor de micro-podcasts educativos.
[CURSO] Recurso para un curso universitario de Machine Learning… (ver utils.py CURSO_CONTEXTO)
[CONCEPTO] "Regresión Lineal"
[TAREA] Monólogo narrativo de 100-120 palabras donde el narrador ES "Regresión Lineal" hablando en primera persona. Estructura: situación → tensión → pregunta abierta final. Apóyate en una imagen mental concreta y fiel al tema.
[RESTRICCIONES] Sin matemática abstracta. Tono íntimo y reflexivo. Puntuación clara para pausas de lectura por voz.
[SALIDA] Solo el texto del monólogo en español, sin etiquetas ni JSON.
```

> Nota: el HTML final NO lo genera un segundo LLM. El monólogo se sintetiza a audio con Groq TTS
> y el reproductor lo construye `build_podcast_html()` en `backend/llm/podcast.py`.

### Recurso 4 — 🎮 Juego de Gamificación (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Diseñador de minijuegos educativos cronometrados.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Minijuego de 3 rondas (30 s c/u) que haga sentir la intuición central de "{concept}". Diseña una mecánica de "detectar o elegir" apropiada al tema: cada ronda muestra un caso concreto con varias opciones, una de las cuales es la correcta. Dificultad creciente. Cada ronda: enunciado, items (lista de 3-6 opciones), respuesta_correcta (el item correcto), feedback_correcto e feedback_incorrecto (≤14 palabras).
[RESTRICCIONES] Sin jerga técnica. La mecánica debe conectar de forma genuina con "{concept}".
[SALIDA] JSON puro con clave "rondas": array de 3 objetos con "ronda","enunciado","items","respuesta_correcta","feedback_correcto","feedback_incorrecto".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] Minijuego de 3 rondas (30 s c/u) que haga sentir la intuición central de "Regresión Lineal"...
[RESTRICCIONES] Sin jerga técnica. La mecánica debe conectar de forma genuina con "Regresión Lineal".
[SALIDA] JSON puro con clave "rondas": array de 3 objetos con "ronda","enunciado","items","respuesta_correcta","feedback_correcto","feedback_incorrecto".
```
(El resto idéntico a la plantilla, con `[CURSO]` y `[CONCEPTO] "Regresión Lineal"`.)

#### Paso 2: prompt_html

```text
[FORMATO] minijuego con cronómetro visual, panel de items cliqueables, puntuación dinámica y pantalla de resultados
```

**Ejemplo completado** (`data_json`):

```text
{
  "rondas": [
    {"ronda": 1, "enunciado": "¿Cuál recta predice mejor el precio de una casa por su tamaño?", "items": ["Recta que pasa lejos de los puntos", "Recta que minimiza las distancias", "Recta vertical"], "respuesta_correcta": "Recta que minimiza las distancias", "feedback_correcto": "¡Esa es la mejor recta!", "feedback_incorrecto": "Mira qué recta queda más cerca de todos los puntos."},
    {"ronda": 2, "enunciado": "Si un punto se aleja mucho, ¿qué le pasa al error?", "items": ["Baja", "Sube mucho", "No cambia"], "respuesta_correcta": "Sube mucho", "feedback_correcto": "Correcto: los outliers pesan.", "feedback_incorrecto": "Cuanto más lejos, mayor el error al cuadrado."}
  ]
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 5 — ⚖️ Dilema Ético (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Redactor de casos de ética en IA.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] caso_narrativo de 130 palabras sobre una empresa ficticia donde el uso de "{concept}" produce una consecuencia ética no intencionada y plausible; pregunta_posicion directa; opciones (array de 3 strings); reflexion_post_voto de 60 palabras que amplía el dilema sin dar una respuesta correcta.
[RESTRICCIONES] Empresa ficticia. Tono periodístico. La consecuencia debe derivarse de forma realista de cómo funciona "{concept}".
[SALIDA] JSON puro con claves "caso_narrativo","pregunta_posicion","opciones","reflexion_post_voto".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] caso_narrativo de 130 palabras sobre una empresa ficticia donde el uso de "Regresión Lineal" produce una consecuencia ética no intencionada y plausible...
[RESTRICCIONES] ...La consecuencia debe derivarse de forma realista de cómo funciona "Regresión Lineal".
[SALIDA] JSON puro con claves "caso_narrativo","pregunta_posicion","opciones","reflexion_post_voto".
```

#### Paso 2: prompt_html

```text
[FORMATO] tarjeta periodística: caso narrativo, 3 botones de votación, revelación animada de la reflexión post-voto
```

**Ejemplo completado** (`data_json`):

```text
{
  "caso_narrativo": "La aseguradora FinCredit usó una regresión lineal sobre el código postal para fijar primas. La recta ajustaba bien el riesgo medio, pero penalizaba barrios enteros por correlaciones históricas, no por el conductor individual.",
  "pregunta_posicion": "¿Debe FinCredit seguir usando el código postal como variable?",
  "opciones": ["Sí, predice bien", "No, discrimina por zona", "Solo con auditoría externa"],
  "reflexion_post_voto": "Una recta que minimiza el error promedio puede ser injusta con individuos: ajustar bien los datos no garantiza decisiones éticas."
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 6 — 📰 Noticia de Impacto (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Periodista tecnológico especializado en IA.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Noticia ficticia plausible sobre un impacto real de "{concept}": titular ≤12 palabras; subtitulo ≤22 palabras; cuerpo_noticia de 90 palabras (organización ficticia, caso concreto); pregunta_cierre ≤12 palabras.
[RESTRICCIONES] Sin términos ultra-técnicos. Tono de urgencia informativa. Genera admiración, no miedo.
[SALIDA] JSON puro con claves "titular","subtitulo","cuerpo_noticia","pregunta_cierre".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] Noticia ficticia plausible sobre un impacto real de "Regresión Lineal": titular ≤12 palabras...
[SALIDA] JSON puro con claves "titular","subtitulo","cuerpo_noticia","pregunta_cierre".
```

#### Paso 2: prompt_html

```text
[FORMATO] periódico digital: titular bold, columna de noticia, pregunta de cierre resaltada, botón Continuar al final
```

**Ejemplo completado** (`data_json`):

```text
{
  "titular": "Una recta simple predice cosechas y salva una región",
  "subtitulo": "Agricultores usan regresión lineal entre lluvia y rendimiento para planificar siembras",
  "cuerpo_noticia": "La cooperativa AgroVista relacionó milímetros de lluvia con kilos por hectárea usando una sola recta. El modelo, lejos de ser perfecto, bastó para anticipar una cosecha baja y redistribuir recursos a tiempo.",
  "pregunta_cierre": "¿Qué otra variable podría mejorar la predicción?"
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 7 — 🎯 Juego de Roles (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Diseñador de aprendizaje basado en roles.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] El estudiante es consultor de IA en su primer día. contexto_rol de 70 palabras (empresa de un sector concreto) donde "{concept}" resolvería un problema; pregunta_decision; opcion_A y opcion_B (cortas); feedback_A y feedback_B de 35 palabras (validan sin revelar la respuesta); pregunta_cierre ≤16 palabras.
[RESTRICCIONES] No nombres explícitamente "{concept}" en el escenario. El feedback no revela la respuesta.
[SALIDA] JSON puro con claves "contexto_rol","pregunta_decision","opcion_A","opcion_B","feedback_A","feedback_B","pregunta_cierre".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] El estudiante es consultor de IA... donde "Regresión Lineal" resolvería un problema...
[RESTRICCIONES] No nombres explícitamente "Regresión Lineal" en el escenario. El feedback no revela la respuesta.
[SALIDA] JSON puro con claves "contexto_rol","pregunta_decision","opcion_A","opcion_B","feedback_A","feedback_B","pregunta_cierre".
```

#### Paso 2: prompt_html

```text
[FORMATO] interfaz ejecutiva oscura: escenario narrativo, 2 botones de decisión, revelación animada del feedback
```

**Ejemplo completado** (`data_json`):

```text
{
  "contexto_rol": "Eres consultor en una tienda online que quiere estimar ventas futuras según el gasto en publicidad. Tienen meses de datos: gasto y ventas. El gerente pide una predicción simple y explicable.",
  "pregunta_decision": "¿Cómo estimas las ventas del próximo mes?",
  "opcion_A": "Trazar una recta gasto→ventas",
  "opcion_B": "Promediar las ventas pasadas",
  "feedback_A": "Buena intuición: aprovechas la relación entre dos variables para extrapolar a nuevos valores de gasto.",
  "feedback_B": "El promedio ignora cómo el gasto influye en las ventas; pierdes capacidad de predicción.",
  "pregunta_cierre": "¿Qué variable añadirías al modelo?"
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 8 — 📅 Timeline Interactivo (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Historiador de la tecnología.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Timeline de 4 hitos reales (o muy plausibles) que llevaron al desarrollo de "{concept}". Cada hito: año, nombre, descripcion de 45 palabras en tono de crónica, dato_sorprendente (1 línea), conexion_actual de 18 palabras con la vida del estudiante hoy.
[RESTRICCIONES] Hechos verídicos o altamente plausibles. Sin fórmulas. Cada hito ≤22 s de lectura.
[SALIDA] JSON puro con clave "hitos": array de 4 objetos con "año","nombre","descripcion","dato_sorprendente","conexion_actual".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] Timeline de 4 hitos reales (o muy plausibles) que llevaron al desarrollo de "Regresión Lineal"...
[SALIDA] JSON puro con clave "hitos": array de 4 objetos con "año","nombre","descripcion","dato_sorprendente","conexion_actual".
```

#### Paso 2: prompt_html

```text
[FORMATO] timeline horizontal con 4 nodos clicables que expanden su información; se completa al abrir los 4
```

**Ejemplo completado** (`data_json`):

```text
{
  "hitos": [
    {"año": "1805", "nombre": "Método de mínimos cuadrados", "descripcion": "Legendre publica una forma de ajustar una recta minimizando la suma de errores al cuadrado, base de toda regresión.", "dato_sorprendente": "Nació para predecir órbitas de cometas.", "conexion_actual": "Hoy lo usa tu app del clima para estimar tendencias."},
    {"año": "1886", "nombre": "Galton y la 'regresión a la media'", "descripcion": "Galton notó que los hijos de padres altos tendían a estaturas más promedio, acuñando el término 'regresión'.", "dato_sorprendente": "El nombre vino de la genética, no de las matemáticas.", "conexion_actual": "Explica por qué los extremos rara vez se repiten."}
  ]
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 9 — 🔐 Escape Room Virtual (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Diseñador de escape rooms educativas digitales.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] 3 acertijos lógicos encadenados cuya lógica refleje la intuición de "{concept}" SIN usar su terminología técnica. Cada acertijo: escenario de 55 palabras, opcion_A, opcion_B, respuesta_correcta ("A" o "B"), explicacion_conexion de 22 palabras que revela el paralelismo con "{concept}".
[RESTRICCIONES] Respuestas deducibles por lógica cotidiana. Tono de urgencia narrativa.
[SALIDA] JSON puro con clave "acertijos": array de 3 objetos con "numero","escenario","opcion_A","opcion_B","respuesta_correcta","explicacion_conexion".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] 3 acertijos lógicos encadenados cuya lógica refleje la intuición de "Regresión Lineal" SIN usar su terminología técnica...
[SALIDA] JSON puro con clave "acertijos": array de 3 objetos con "numero","escenario","opcion_A","opcion_B","respuesta_correcta","explicacion_conexion".
```

#### Paso 2: prompt_html

```text
[FORMATO] escape room: fondo oscuro, 3 candados SVG que se abren progresivamente, un escenario por pantalla, botones A/B
```

**Ejemplo completado** (`data_json`):

```text
{
  "acertijos": [
    {"numero": 1, "escenario": "Estás atrapado y ves una serie de marcas en la pared que suben de forma constante: 2, 4, 6, 8... La salida exige adivinar la siguiente marca para abrir el candado.", "opcion_A": "10", "opcion_B": "12", "respuesta_correcta": "A", "explicacion_conexion": "Detectaste una tendencia constante y la extendiste: eso hace una recta de regresión."},
    {"numero": 2, "escenario": "Una balanza desnivelada tiene puntos pegados arriba y abajo. Debes colocar una varilla recta que toque lo más cerca posible de todos para equilibrarla.", "opcion_A": "La que pase por el centro de la nube", "opcion_B": "La que toque solo el punto más alto", "respuesta_correcta": "A", "explicacion_conexion": "La mejor recta queda cerca de todos los puntos, no de uno solo."}
  ]
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 10 — 🎛️ Simulador Intuitivo (direct_code)

#### prompt_simulador (único paso)

```text
[ROL] Desarrollador front-end de simuladores educativos interactivos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Un simulador HTML5 autocontenido para la fase ENGAGE que provoque curiosidad: el estudiante manipula algo y ve el efecto, descubriendo la intuición central de "{concept}".
[TAREA] Diseña la mecánica interactiva más apropiada para "{concept}" (slider, lienzo clicable, arrastre, botones...). Debe incluir: al menos un control manipulable, una visualización que reacciona en tiempo real (SVG o canvas), retroalimentación visual del estado, y un texto breve que interpreta lo que ocurre. Un botón de cierre ("¿Qué descubriste?") visible tras explorar.
[REQUISITOS] HTML5 autocontenido con todo CSS y JS embebido. Mínimo 280 líneas de calidad sin secciones vacías. Paleta oscura elegante (educativa oscura). El control manipulable debe responder en <50ms a la interacción.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] ← ver sección "Contexto compartido en prompts"
[SCORM] ← ver sección "Contexto compartido en prompts". Llama _scormComplete() al pulsar el botón de cierre.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[CONCEPTO] "Regresión Lineal"
[OBJETIVO] Un simulador HTML5 autocontenido para la fase ENGAGE que provoque curiosidad: el estudiante manipula algo y ve el efecto, descubriendo la intuición central de "Regresión Lineal".
[TAREA] Diseña la mecánica interactiva más apropiada para "Regresión Lineal" (slider, lienzo clicable, arrastre, botones...)...
[REQUISITOS] ...Paleta oscura elegante (educativa oscura). El control manipulable debe responder en <50ms a la interacción.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS)
[SCORM] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS). Llama _scormComplete() al pulsar el botón de cierre.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```
(El resto idéntico a la plantilla, con `[CURSO]` y `[ROL]` sin cambios.)

---

## Prompts de generación — EXPLORE

Plantillas exactas de `backend/prometheus/prompts/explore_prompts.py`. `CODE_ONLY = {1, 6, 10}` →
`prompt_codigo` (un solo paso). El resto (2,3,4,5,7,8,9) → `prompt_texto` + `prompt_html`.
El cuerpo de `prompt_html` es común; solo cambia el `[FORMATO]`.

### Recurso 1 — 🧪 Simulador Virtual Lab (direct_code)

#### prompt_codigo (único paso)

```text
[ROL] Desarrollador front-end de laboratorios virtuales interactivos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Un laboratorio virtual HTML5 donde el estudiante EXPLORA "{concept}" manipulando sus elementos y observando los resultados.
[TAREA] Diseña la simulación más representativa de cómo funciona "{concept}": elige datos de ejemplo, controles y visualización (SVG o canvas) apropiados al tema. Debe permitir: (1) manipular entradas o parámetros, (2) ejecutar o iterar el proceso central de "{concept}", (3) ver el resultado actualizarse, (4) un botón que explica qué está ocurriendo.
[REQUISITOS] HTML5+JS autocontenido. Mínimo 320 líneas de calidad. Datos de ejemplo hardcodeados como arrays JS.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] ← ver sección "Contexto compartido en prompts"
[SCORM] ← ver sección "Contexto compartido en prompts". Llama _scormComplete() tras varias iteraciones o al pulsar el botón explicativo.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[ROL] Desarrollador front-end de laboratorios virtuales interactivos.
[CURSO] Recurso para un curso universitario de Machine Learning. Audiencia: estudiantes en su primer contacto con el tema, sin formación matemática avanzada. Idioma: español. El recurso debe ser pedagógicamente sólido y técnicamente correcto, pero con lenguaje accesible. Todo ejemplo, dato, analogía o mecánica debe ser específico y fiel al concepto de ML indicado — nunca genérico ni de otro subtema.
[CONCEPTO] "Regresión Lineal"
[OBJETIVO] Un laboratorio virtual HTML5 donde el estudiante EXPLORA "Regresión Lineal" manipulando sus elementos y observando los resultados.
[TAREA] Diseña la simulación más representativa de cómo funciona "Regresión Lineal": elige datos de ejemplo (p. ej. tamaño→precio de casas), controles para la pendiente y el intercepto, y un scatter SVG. Debe permitir: (1) ajustar pendiente e intercepto, (2) recalcular el error cuadrático, (3) ver la recta y el error actualizarse, (4) un botón "¿Por qué esta recta?".
[REQUISITOS] HTML5+JS autocontenido. Mínimo 320 líneas de calidad. Datos de ejemplo hardcodeados como arrays JS.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS)
[SCORM] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS). Llama _scormComplete() tras varias iteraciones o al pulsar el botón explicativo.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

### Recurso 2 — 🤔 Agente Socrático (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Agente pedagógico socrático "DataGuide" — guías, nunca revelas la respuesta.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Sesión socrática de 6 turnos que lleva al estudiante a descubrir la idea central de "{concept}". Cada turno: dato_mostrado (un ejemplo, dato o situación concreta y relevante a "{concept}"), pregunta (≤28 palabras, abierta, guía al descubrimiento), respuesta_correcta (seguimiento si acierta), respuesta_incorrecta (pista adicional sin revelar).
[RESTRICCIONES] Nunca digas "la respuesta es". Tono de mentor curioso. Dificultad creciente entre turnos.
[SALIDA] JSON puro con clave "turnos": array de 6 objetos con "turno","dato_mostrado","pregunta","respuesta_correcta","respuesta_incorrecta".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] Sesión socrática de 6 turnos que lleva al estudiante a descubrir la idea central de "Regresión Lineal"...
[SALIDA] JSON puro con clave "turnos": array de 6 objetos con "turno","dato_mostrado","pregunta","respuesta_correcta","respuesta_incorrecta".
```

#### Paso 2: prompt_html

```text
[FORMATO] chat educativo: burbujas de DataGuide, campo de texto del estudiante, feedback revelado por turno, barra de progreso
```

**Ejemplo completado** (`data_json`):

```text
{
  "turnos": [
    {"turno": 1, "dato_mostrado": "Casas: 50m²→$100k, 100m²→$200k, 150m²→$300k.", "pregunta": "¿Notas alguna relación entre el tamaño y el precio?", "respuesta_correcta": "Exacto, el precio sube de forma proporcional al tamaño.", "respuesta_incorrecta": "Fíjate cómo crece el precio cada 50m²."},
    {"turno": 2, "dato_mostrado": "Una casa nueva mide 120m².", "pregunta": "¿Cómo estimarías su precio con esa tendencia?", "respuesta_correcta": "Muy bien, extiendes la línea que viste antes.", "respuesta_incorrecta": "Imagina prolongar la relación anterior hasta 120m²."}
  ]
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 3 — 🎮 Juego Drag & Drop (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Diseñador de minijuegos de clasificación para ciencia de datos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Juego drag & drop de 6 rondas donde el estudiante clasifica items en 2 categorías propias de "{concept}" (elige las dos categorías más ilustrativas del tema). Define category_a y category_b. Cada ronda: item, contexto (1 línea), respuesta ("A" o "B"), feedback_correcto (≤16 palabras), feedback_incorrecto (≤16 palabras). Incluye al menos un caso ambiguo.
[RESTRICCIONES] Sin repetir items. Dificultad creciente (de obvio a ambiguo).
[SALIDA] JSON puro con claves "category_a","category_b" y "rondas": array de 6 objetos con "ronda","item","contexto","respuesta","feedback_correcto","feedback_incorrecto".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] Juego drag & drop de 6 rondas donde el estudiante clasifica items en 2 categorías propias de "Regresión Lineal" (p. ej. "Relación lineal" vs "Relación no lineal")...
[SALIDA] JSON puro con claves "category_a","category_b" y "rondas": array de 6 objetos...
```

#### Paso 2: prompt_html

```text
[FORMATO] juego drag & drop: items arrastrables, 2 zonas destino etiquetadas, animación de arrastre, feedback inmediato, puntuación
```

**Ejemplo completado** (`data_json`):

```text
{
  "category_a": "Relación lineal",
  "category_b": "Relación no lineal",
  "rondas": [
    {"ronda": 1, "item": "Horas estudiadas vs nota", "contexto": "A más horas, mejor nota, de forma constante.", "respuesta": "A", "feedback_correcto": "Sí, crece de forma constante.", "feedback_incorrecto": "El aumento es parejo: es lineal."},
    {"ronda": 2, "item": "Edad vs estatura adulta", "contexto": "Crece rápido y luego se estanca.", "respuesta": "B", "feedback_correcto": "Correcto, la curva se aplana.", "feedback_incorrecto": "No es una recta: cambia de ritmo."}
  ]
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 4 — 🎬 Video con Pausa Activa (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Guionista pedagógico de visualización de ML.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Guion de video de 120 s sobre "{concept}" con marcadores de tiempo cada 30 s y metáforas cotidianas, más 3 preguntas de pausa activa (en los segundos 30, 75 y 110) que provoquen una predicción sin revelar la teoría.
[RESTRICCIONES] Sin fórmulas. Preguntas abiertas, no de opción múltiple.
[SALIDA] JSON puro con claves "guion" (texto con marcadores de tiempo) y "pausas": array de 3 objetos con "segundo","pregunta".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] Guion de video de 120 s sobre "Regresión Lineal" con marcadores de tiempo cada 30 s...
[SALIDA] JSON puro con claves "guion" y "pausas": array de 3 objetos con "segundo","pregunta".
```

#### Paso 2: prompt_html

```text
[FORMATO] storyboard interactivo: guion por secciones, reproductor simulado con barra de progreso, overlay de pregunta de pausa
```

**Ejemplo completado** (`data_json`):

```text
{
  "guion": "0s: gráfico de puntos del precio de casas · 30s: aparece una recta tentativa · 75s: la recta se ajusta acercándose a los puntos · 110s: se predice un caso nuevo",
  "pausas": [
    {"segundo": 30, "pregunta": "¿Por dónde crees que debería pasar la línea?"},
    {"segundo": 75, "pregunta": "¿Qué hace que una recta sea 'mejor' que otra?"}
  ]
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 5 — 📖 Lectura Interactiva (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Redactor de materiales de análisis exploratorio.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] lectura de 220 palabras (tono periodístico intrigante) que lleva al estudiante a observar un patrón relacionado con "{concept}"; un conjunto_datos ficticio pero plausible y relevante a "{concept}" (8-10 registros); pregunta de exploración; revelacion de 50 palabras que conecta el patrón con "{concept}".
[RESTRICCIONES] Sin la terminología técnica de "{concept}" en la lectura inicial. El patrón debe ser identificable a simple vista.
[SALIDA] JSON puro con claves "lectura","conjunto_datos" (array de objetos),"pregunta","revelacion".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] lectura de 220 palabras... que lleva al estudiante a observar un patrón relacionado con "Regresión Lineal"; un conjunto_datos ficticio... (8-10 registros)...
[SALIDA] JSON puro con claves "lectura","conjunto_datos","pregunta","revelacion".
```

#### Paso 2: prompt_html

```text
[FORMATO] lectura interactiva: texto periodístico y tabla del conjunto de datos, pregunta destacada, botón 'Revelar patrón' animado
```

**Ejemplo completado** (`data_json`):

```text
{
  "lectura": "Una cadena de cafeterías notó algo curioso: los días más calurosos vendían más bebidas frías. Cuanto más subía el termómetro, más altos eran los ingresos, casi en línea recta...",
  "conjunto_datos": [
    {"temperatura_C": 18, "ventas_frias": 40},
    {"temperatura_C": 24, "ventas_frias": 70},
    {"temperatura_C": 30, "ventas_frias": 100}
  ],
  "pregunta": "¿Podrías estimar las ventas si mañana hace 27°C?",
  "revelacion": "Lo que viste es una regresión lineal: una recta que resume cómo una variable (temperatura) predice otra (ventas)."
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 6 — 🎛️ Simulador de Slider (direct_code)

#### prompt_codigo (único paso)

```text
[ROL] Desarrollador front-end de simuladores paramétricos educativos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Un simulador HTML5 centrado en UN parámetro clave de "{concept}" para que el estudiante descubra su efecto.
[TAREA] Identifica el parámetro o variable más ilustrativo de "{concept}" y construye: (1) un slider o control para ese parámetro con un rango sensato, (2) un gráfico SVG que se actualiza en tiempo real (<100 ms), (3) zonas o estados coloreados que indican el comportamiento (p. ej. correcto / límite / incorrecto), (4) un campo para la hipótesis del estudiante, (5) un botón "Revelar zona óptima".
[REQUISITOS] HTML5+JS autocontenido. Mínimo 320 líneas de calidad.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] ← ver sección "Contexto compartido en prompts"
[SCORM] ← ver sección "Contexto compartido en prompts". Llama _scormComplete() al revelar.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[OBJETIVO] Un simulador HTML5 centrado en UN parámetro clave de "Regresión Lineal" para que el estudiante descubra su efecto.
[TAREA] Identifica el parámetro más ilustrativo de "Regresión Lineal" (la pendiente) y construye: (1) un slider para la pendiente con rango -3 a 3, (2) un scatter SVG con la recta superpuesta que se actualiza en tiempo real, (3) zonas coloreadas según el error (verde óptimo / rojo alto), (4) un campo de hipótesis, (5) botón "Revelar zona óptima".
[REQUISITOS] HTML5+JS autocontenido. Mínimo 320 líneas de calidad.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS)
[SCORM] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS). Llama _scormComplete() al revelar.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

### Recurso 7 — 🔬 Experimento Guiado (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Instructor de análisis exploratorio de datos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Experimento guiado de 4 pasos para explorar "{concept}": descripcion_dataset (un conjunto de datos plausible y relevante al tema, descrito en texto), puntos para un gráfico (20-25 puntos con coordenadas x/y/grupo que formen una estructura visible coherente con "{concept}"), 3 preguntas de exploración progresivas, revelacion de 60 palabras que conecta lo observado con "{concept}".
[RESTRICCIONES] Sin código visible. Las preguntas guían, no evalúan.
[SALIDA] JSON puro con claves "descripcion_dataset","puntos" (array de objetos con x,y,grupo),"preguntas" (array de 3),"revelacion".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] Experimento guiado de 4 pasos para explorar "Regresión Lineal"... 20-25 puntos con coordenadas x/y/grupo que formen una nube alargada con tendencia ascendente...
[SALIDA] JSON puro con claves "descripcion_dataset","puntos","preguntas","revelacion".
```

#### Paso 2: prompt_html

```text
[FORMATO] laboratorio EDA: tabla del dataset, gráfico scatter SVG, 3 preguntas secuenciales, botón 'Revelar' que colorea los grupos
```

**Ejemplo completado** (`data_json`):

```text
{
  "descripcion_dataset": "Horas de estudio (x) frente a nota final (y) de 22 estudiantes; se aprecia una nube alargada que asciende.",
  "puntos": [
    {"x": 1, "y": 52, "grupo": "bajo"},
    {"x": 5, "y": 78, "grupo": "medio"},
    {"x": 9, "y": 95, "grupo": "alto"}
  ],
  "preguntas": ["¿Hacia dónde apunta la nube de puntos?", "¿Una recta resumiría bien la tendencia?", "¿Qué nota predirías para 7 horas?"],
  "revelacion": "Ajustar una recta a estos puntos es regresión lineal: resume la relación y permite predecir notas para horas no observadas."
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 8 — 🎭 Juego de Roles (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Diseñador de aprendizaje basado en roles para científicos de datos junior.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] 4 escenarios de negocio de sectores distintos donde aplicar "{concept}". Cada escenario: problema ≤45 palabras en lenguaje cotidiano, opcion_A, opcion_B, respuesta_correcta, feedback_A y feedback_B (≤25 palabras). Mensajes finales según el puntaje, con claves "0","1-2","3-4".
[RESTRICCIONES] Sin jerga técnica en los enunciados. Respuesta objetivamente correcta y justificable.
[SALIDA] JSON puro con claves "escenarios" (array de 4 objetos con id,problema,opcion_A,opcion_B,respuesta_correcta,feedback_A,feedback_B) y "mensajes_finales" (objeto).
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] 4 escenarios de negocio de sectores distintos donde aplicar "Regresión Lineal"...
[SALIDA] JSON puro con claves "escenarios" y "mensajes_finales".
```

#### Paso 2: prompt_html

```text
[FORMATO] escenarios ejecutivos secuenciales: 2 botones de decisión, feedback animado, pantalla final con puntaje y mensaje
```

**Ejemplo completado** (`data_json`):

```text
{
  "escenarios": [
    {"id": 1, "problema": "Una tienda quiere prever ventas según el gasto en anuncios; tiene datos históricos de ambos.", "opcion_A": "Ajustar una recta gasto→ventas", "opcion_B": "Usar el promedio de ventas", "respuesta_correcta": "A", "feedback_A": "Correcto: la recta aprovecha la relación entre las variables.", "feedback_B": "El promedio ignora el efecto del gasto."},
    {"id": 2, "problema": "Un hospital busca relacionar dosis con tiempo de recuperación, que crece y luego se estanca.", "opcion_A": "Regresión lineal simple", "opcion_B": "Un modelo no lineal", "respuesta_correcta": "B", "feedback_A": "La relación no es recta: una línea se queda corta.", "feedback_B": "Bien: la curva se aplana, no es lineal."}
  ],
  "mensajes_finales": {"0": "Repasa cuándo conviene una recta.", "1-2": "Vas bien, afina tu criterio.", "3-4": "¡Dominas cuándo aplicar regresión lineal!"}
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 9 — 🗺️ Mapa Mental (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Facilitador de mapas mentales para el aprendizaje de ML.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] 6 tarjetas que emparejan una pista_cotidiana con su nodo_tecnico real de "{concept}" (relación 1:1). Cada tarjeta: feedback_correcto (✓ y 1 línea de contexto), feedback_incorrecto (✗ y pista sin revelar). Una revelacion final de 90 palabras que integra los 6 nodos en el marco conceptual de "{concept}".
[RESTRICCIONES] Las pistas se entienden sin conocimiento previo. Tono celebratorio en la revelación.
[SALIDA] JSON puro con claves "tarjetas" (array de 6 objetos con id,pista_cotidiana,nodo_tecnico,feedback_correcto,feedback_incorrecto) y "revelacion".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] 6 tarjetas que emparejan una pista_cotidiana con su nodo_tecnico real de "Regresión Lineal" (relación 1:1)...
[SALIDA] JSON puro con claves "tarjetas" y "revelacion".
```

#### Paso 2: prompt_html

```text
[FORMATO] mapa mental drag & drop: 6 pistas y 6 nodos técnicos, conexión por arrastre, feedback por par, revelación al completar
```

**Ejemplo completado** (`data_json`):

```text
{
  "tarjetas": [
    {"id": 1, "pista_cotidiana": "La inclinación de una rampa", "nodo_tecnico": "Pendiente", "feedback_correcto": "✓ La pendiente mide cuánto cambia y por cada unidad de x.", "feedback_incorrecto": "✗ Piensa qué controla la inclinación de la recta."},
    {"id": 2, "pista_cotidiana": "El punto donde empieza una escalera", "nodo_tecnico": "Intercepto", "feedback_correcto": "✓ El intercepto es el valor de y cuando x es cero.", "feedback_incorrecto": "✗ ¿Dónde corta la recta el eje vertical?"}
  ],
  "revelacion": "Pendiente, intercepto, error y mejor ajuste forman juntos la regresión lineal: una recta que resume datos y predice nuevos valores."
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 10 — 💡 Lab de Hipótesis (direct_code)

#### prompt_codigo (único paso)

```text
[ROL] Desarrollador front-end de laboratorios de experimentación.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Un laboratorio HTML5 donde el estudiante formula una hipótesis sobre "{concept}", experimenta y la contrasta.
[TAREA] Construye: (1) una visualización de datos relevante a "{concept}" (scatter, curva u otra; datos hardcodeados como array JS), (2) controles para probar configuraciones, (3) métricas o indicadores visibles que cambian con cada prueba, (4) un campo de hipótesis, (5) un botón "Revelar" que muestra la configuración óptima y nombra el concepto técnico correcto.
[REQUISITOS] HTML5+JS autocontenido. Mínimo 320 líneas de calidad.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] ← ver sección "Contexto compartido en prompts"
[SCORM] ← ver sección "Contexto compartido en prompts". Llama _scormComplete() al revelar.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[OBJETIVO] Un laboratorio HTML5 donde el estudiante formula una hipótesis sobre "Regresión Lineal", experimenta y la contrasta.
[TAREA] Construye: (1) un scatter de tamaño→precio de casas (datos hardcodeados como array JS), (2) sliders de pendiente e intercepto, (3) el error cuadrático medio visible que cambia con cada prueba, (4) un campo de hipótesis, (5) un botón "Revelar" que muestra la recta óptima por mínimos cuadrados y nombra el concepto "regresión lineal".
[REQUISITOS] HTML5+JS autocontenido. Mínimo 320 líneas de calidad.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS)
[SCORM] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS). Llama _scormComplete() al revelar.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

---

## Prompts de generación — EXPLAIN

Plantillas exactas de `backend/prometheus/prompts/explain_prompts.py`. `CODE_ONLY = {3, 5, 8, 10}` →
`prompt_codigo` (un solo paso). El resto (1,2,4,6,7,9) → `prompt_texto` + `prompt_html`.
El cuerpo de `prompt_html` es común; solo cambia el `[FORMATO]`.

### Recurso 1 — 🎥 Video Teórico (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Guionista de videos educativos teoricos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Video teorico: guion_visual con 4 marcadores (cada 30 s) usando metaforas cotidianas; narracion_voz <=120 palabras tono divulgativo con pregunta reflexiva; prompt_video en ingles <=100 palabras para generador.
[RESTRICCIONES] Sin formulas ni jerga densa. Metaforas visuales potentes.
[SALIDA] JSON puro con claves "guion_visual","narracion_voz","prompt_video".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[ROL] Guionista de videos educativos teoricos.
[CURSO] Recurso para un curso universitario de Machine Learning. Audiencia: estudiantes en su primer contacto con el tema, sin formación matemática avanzada. Idioma: español. El recurso debe ser pedagógicamente sólido y técnicamente correcto, pero con lenguaje accesible. Todo ejemplo, dato, analogía o mecánica debe ser específico y fiel al concepto de ML indicado — nunca genérico ni de otro subtema.
[CONCEPTO] "Regresión Lineal"
[TAREA] Video teorico: guion_visual con 4 marcadores (cada 30 s) usando metaforas cotidianas; narracion_voz <=120 palabras tono divulgativo con pregunta reflexiva; prompt_video en ingles <=100 palabras para generador.
[RESTRICCIONES] Sin formulas ni jerga densa. Metaforas visuales potentes.
[SALIDA] JSON puro con claves "guion_visual","narracion_voz","prompt_video".
```

#### Paso 2: prompt_html

```text
[FORMATO] storyboard de video: guion visual con bloques temporales, narracion estilizada, prompt video en caja copiable
```

**Ejemplo completado** (`data_json`):

```text
{
  "guion_visual": "0s: dos columnas de datos (horas, nota) · 30s: aparecen como puntos · 60s: surge una recta entre ellos · 90s: la recta predice un caso nuevo",
  "narracion_voz": "Imagina que tienes pares de datos y quieres una regla simple que los conecte. La regresión lineal traza la recta que mejor resume esa relación. ¿Qué predicción harías con ella?",
  "prompt_video": "educational animation, two data columns turning into scatter points, a clean straight line fitting them, soft academic palette"
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 2 — 📖 Lectura Guiada (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Redactor academico de lecturas guiadas.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Lectura de 250 palabras: introduccion (caso real), desarrollo (3 ideas centrales de "{concept}" con ejemplo cada una), cierre (aplicaciones). 3 preguntas intercaladas con respuesta modelo.
[RESTRICCIONES] Lenguaje accesible sin formulas. Cada idea central <=70 palabras.
[SALIDA] JSON puro con claves "introduccion","secciones" (array de 3 con idea,ejemplo,pregunta,respuesta),"cierre".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] Lectura de 250 palabras: introduccion (caso real), desarrollo (3 ideas centrales de "Regresión Lineal" con ejemplo cada una), cierre (aplicaciones)...
[SALIDA] JSON puro con claves "introduccion","secciones","cierre".
```

#### Paso 2: prompt_html

```text
[FORMATO] lectura guiada: texto con secciones expandibles, preguntas con toggle de respuesta, disenio articulo academico
```

**Ejemplo completado** (`data_json`):

```text
{
  "introduccion": "Cuando una inmobiliaria fija precios, observa que casas más grandes cuestan más. La regresión lineal convierte esa intuición en una recta predictiva.",
  "secciones": [
    {"idea": "Es una recta de mejor ajuste", "ejemplo": "Tamaño vs precio: una recta que pasa cerca de todos los puntos.", "pregunta": "¿Qué hace 'mejor' a una recta?", "respuesta": "Que minimiza la suma de errores al cuadrado."},
    {"idea": "Se define por pendiente e intercepto", "ejemplo": "Pendiente: $/m²; intercepto: precio base.", "pregunta": "¿Qué significa la pendiente?", "respuesta": "Cuánto sube el precio por cada m² extra."}
  ],
  "cierre": "Se usa en finanzas, salud y marketing para predecir y entender relaciones entre variables."
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 3 — 🗺️ Mapa Conceptual (direct_code)

#### prompt_codigo (único paso)

```text
[ROL] Desarrollador front-end de mapas conceptuales interactivos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Mapa conceptual HTML5 donde el estudiante explore visualmente subtemas y relaciones de "{concept}".
[TAREA] Grafo SVG con 6-8 nodos clave de "{concept}", conexiones etiquetadas, nodos expandibles al clic con definicion breve, leyenda de colores y boton "Explorar todo". Nodos SVG reales con <text>.
[REQUISITOS] HTML5+JS autocontenido. Minimo 300 lineas de calidad.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] ← ver sección "Contexto compartido en prompts"
[SCORM] ← ver sección "Contexto compartido en prompts". Llama _scormComplete() al explorar todos los nodos.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[OBJETIVO] Mapa conceptual HTML5 donde el estudiante explore visualmente subtemas y relaciones de "Regresión Lineal".
[TAREA] Grafo SVG con 6-8 nodos clave de "Regresión Lineal" (variable predictora, variable respuesta, pendiente, intercepto, error/residuos, mínimos cuadrados, predicción), conexiones etiquetadas, nodos expandibles al clic con definicion breve, leyenda de colores y boton "Explorar todo". Nodos SVG reales con <text>.
[REQUISITOS] HTML5+JS autocontenido. Minimo 300 lineas de calidad.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS)
[SCORM] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS). Llama _scormComplete() al explorar todos los nodos.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

### Recurso 4 — ❓ FAQ Interactivo (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Curador de contenido educativo interactivo.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] FAQ de 6 preguntas genuinas sobre "{concept}". Cada una: pregunta en lenguaje estudiantil, respuesta <=60 palabras con analogia, etiqueta (principiante/intermedio/avanzado), categoria.
[RESTRICCIONES] Preguntas genuinas no retoricas. Respuestas que iluminan sin clase magistral.
[SALIDA] JSON puro con clave "faqs": array de 6 objetos con "pregunta","respuesta","etiqueta","categoria".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] FAQ de 6 preguntas genuinas sobre "Regresión Lineal"...
[SALIDA] JSON puro con clave "faqs": array de 6 objetos con "pregunta","respuesta","etiqueta","categoria".
```

#### Paso 2: prompt_html

```text
[FORMATO] FAQ interactivo: acordeon con tags de categoria, barra de filtro, contador de preguntas exploradas
```

**Ejemplo completado** (`data_json`):

```text
{
  "faqs": [
    {"pregunta": "¿Qué predice una regresión lineal?", "respuesta": "Estima el valor de una variable a partir de otra trazando la recta que mejor las relaciona, como predecir el precio de una casa por su tamaño.", "etiqueta": "principiante", "categoria": "Concepto"},
    {"pregunta": "¿Qué es la 'mejor recta'?", "respuesta": "La que minimiza la suma de los errores al cuadrado entre la recta y los puntos reales.", "etiqueta": "intermedio", "categoria": "Ajuste"}
  ]
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 5 — ✨ Demo Animada (direct_code)

#### prompt_codigo (único paso)

```text
[ROL] Desarrollador front-end de demostraciones animadas educativas.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Demo animada HTML5 que ilustre paso a paso el funcionamiento de "{concept}".
[TAREA] Animacion SVG/canvas con escena inicial, controles play/pause/step, 4-5 pasos progresivos, texto explicativo por paso y boton "Repetir". requestAnimationFrame.
[REQUISITOS] HTML5+JS autocontenido. Minimo 300 lineas de calidad.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] ← ver sección "Contexto compartido en prompts"
[SCORM] ← ver sección "Contexto compartido en prompts". Llama _scormComplete() tras completar todos los pasos.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[OBJETIVO] Demo animada HTML5 que ilustre paso a paso el funcionamiento de "Regresión Lineal".
[TAREA] Animacion SVG con escena inicial (puntos dispersos), controles play/pause/step, 4-5 pasos progresivos (1: mostrar puntos, 2: recta inicial mala, 3: medir residuos, 4: la recta gira hacia el mejor ajuste, 5: predicción), texto explicativo por paso y boton "Repetir". requestAnimationFrame.
[REQUISITOS] HTML5+JS autocontenido. Minimo 300 lineas de calidad.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS)
[SCORM] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS). Llama _scormComplete() tras completar todos los pasos.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

### Recurso 6 — 📝 Glosario Visual (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Lexicografo visual de conceptos de ML.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Glosario de 8 terminos de "{concept}". Cada uno: nombre <=20 chars, definicion <=50 palabras, icono_sugerido (emoji+descripcion), ejemplo_concreto <=30 palabras del mundo real.
[RESTRICCIONES] Definiciones autocontenidas. Iconos distintos entre si.
[SALIDA] JSON puro con clave "terminos": array de 8 objetos con "termino","definicion","icono_sugerido","ejemplo_concreto".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] Glosario de 8 terminos de "Regresión Lineal"...
[SALIDA] JSON puro con clave "terminos": array de 8 objetos con "termino","definicion","icono_sugerido","ejemplo_concreto".
```

#### Paso 2: prompt_html

```text
[FORMATO] glosario visual: grid de tarjetas con emoji grande, definicion y ejemplo, filtro por categoria, expandir/colapsar
```

**Ejemplo completado** (`data_json`):

```text
{
  "terminos": [
    {"termino": "Pendiente", "definicion": "Cuánto cambia la variable predicha por cada unidad de la predictora; la inclinación de la recta.", "icono_sugerido": "📐 una rampa inclinada", "ejemplo_concreto": "Cada m² extra sube el precio $1.000."},
    {"termino": "Residuo", "definicion": "Diferencia entre el valor real y el predicho por la recta.", "icono_sugerido": "📏 una regla midiendo un hueco", "ejemplo_concreto": "La casa costó $5k más de lo predicho."}
  ]
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 7 — ⏳ Línea de Tiempo (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Historiador de la ciencia de datos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Timeline de 5 hitos historicos reales de "{concept}". Cada hito: anio, titulo <=25 chars, descripcion 40 palabras tono cronica, dato_curioso, legado_actual 20 palabras.
[RESTRICCIONES] Hechos verificables, sin mitos. Conexion logica entre hitos.
[SALIDA] JSON puro con clave "hitos": array de 5 objetos con "anio","titulo","descripcion","dato_curioso","legado_actual".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] Timeline de 5 hitos historicos reales de "Regresión Lineal"...
[SALIDA] JSON puro con clave "hitos": array de 5 objetos con "anio","titulo","descripcion","dato_curioso","legado_actual".
```

#### Paso 2: prompt_html

```text
[FORMATO] timeline horizontal: 5 nodos conectados, clic expande descripcion, barra de progreso, navegacion prev/next
```

**Ejemplo completado** (`data_json`):

```text
{
  "hitos": [
    {"anio": "1805", "titulo": "Minimos cuadrados", "descripcion": "Legendre publica el método de mínimos cuadrados para ajustar rectas a observaciones astronómicas.", "dato_curioso": "Gauss reclamó haberlo usado antes.", "legado_actual": "Sigue siendo el núcleo de la regresión moderna."},
    {"anio": "1886", "titulo": "Galton: regresion", "descripcion": "Galton estudia la herencia de la estatura y acuña el término 'regresión'.", "dato_curioso": "El nombre viene de la biología.", "legado_actual": "Dio nombre a toda una familia de modelos."}
  ]
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 8 — 🧩 Diagrama de Framework (direct_code)

#### prompt_codigo (único paso)

```text
[ROL] Desarrollador front-end de diagramas de framework educativo.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Diagrama HTML5 que muestre la arquitectura o taxonomia de "{concept}" como framework visual.
[TAREA] Diagrama SVG con bloques jerarquicos de "{concept}", flechas de flujo, tooltips al hover, zoom/reset y leyenda. SVG con viewBox + preserveAspectRatio.
[REQUISITOS] HTML5+JS autocontenido. Minimo 300 lineas de calidad.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] ← ver sección "Contexto compartido en prompts"
[SCORM] ← ver sección "Contexto compartido en prompts". Llama _scormComplete() al explorar todos los tooltips.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[OBJETIVO] Diagrama HTML5 que muestre la arquitectura o taxonomia de "Regresión Lineal" como framework visual.
[TAREA] Diagrama SVG con bloques jerarquicos de "Regresión Lineal" (Datos → Modelo: pendiente+intercepto → Función de costo: mínimos cuadrados → Ajuste → Predicción), flechas de flujo, tooltips al hover, zoom/reset y leyenda. SVG con viewBox + preserveAspectRatio.
[REQUISITOS] HTML5+JS autocontenido. Minimo 300 lineas de calidad.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS)
[SCORM] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS). Llama _scormComplete() al explorar todos los tooltips.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

### Recurso 9 — 📊 Tabla Comparativa (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Analista comparativo de tecnologias de ML.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Tabla comparativa de "{concept}" vs 3 conceptos relacionados. 4 dimensiones relevantes. Por concepto: valores y balance ventaja/desventaja.
[RESTRICCIONES] Comparaciones objetivas y medibles. Sin sesgo. Dimensiones que diferencien.
[SALIDA] JSON puro con claves "dimensiones" (array de 4) y "comparaciones" (array de 3 con concepto,valores,balance).
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] Tabla comparativa de "Regresión Lineal" vs 3 conceptos relacionados (p. ej. Regresión Polinómica, Árboles de Decisión, KNN). 4 dimensiones relevantes...
[SALIDA] JSON puro con claves "dimensiones" y "comparaciones".
```

#### Paso 2: prompt_html

```text
[FORMATO] tabla comparativa: columnas responsivas, iconos ventaja/desventaja, tooltips, toggle de dimensiones
```

**Ejemplo completado** (`data_json`):

```text
{
  "dimensiones": ["Interpretabilidad", "Datos requeridos", "Capta no linealidad", "Costo de cómputo"],
  "comparaciones": [
    {"concepto": "Regresión Lineal", "valores": ["Alta", "Pocos", "No", "Muy bajo"], "balance": "Ventaja: simple y explicable. Desventaja: falla con relaciones curvas."},
    {"concepto": "Árboles de Decisión", "valores": ["Media", "Medios", "Sí", "Medio"], "balance": "Ventaja: capta no linealidad. Desventaja: tiende a sobreajustar."}
  ]
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 10 — 🎨 Infografía Interactiva (direct_code)

#### prompt_codigo (único paso)

```text
[ROL] Desarrollador front-end de infografias interactivas.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Infografia HTML5 que comunique la esencia y datos clave de "{concept}".
[TAREA] 5-6 secciones reveladas progresivamente con iconos SVG, dato impactante por seccion, barra de progreso y boton "Ver resumen" final. Animaciones de entrada.
[REQUISITOS] HTML5+JS autocontenido. Minimo 300 lineas de calidad.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] ← ver sección "Contexto compartido en prompts"
[SCORM] ← ver sección "Contexto compartido en prompts". Llama _scormComplete() al llegar a la seccion final.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[OBJETIVO] Infografia HTML5 que comunique la esencia y datos clave de "Regresión Lineal".
[TAREA] 5-6 secciones reveladas progresivamente con iconos SVG (qué es, la recta, pendiente e intercepto, el error, dónde se usa), dato impactante por seccion, barra de progreso y boton "Ver resumen" final. Animaciones de entrada.
[REQUISITOS] HTML5+JS autocontenido. Minimo 300 lineas de calidad.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS)
[SCORM] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS). Llama _scormComplete() al llegar a la seccion final.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

---

## Prompts de generación — ELABORATE

Plantillas exactas de `backend/prometheus/prompts/elaborate_prompts.py`. `CODE_ONLY = {4, 5, 7, 9}` →
`prompt_codigo` (un solo paso). El resto (1,2,3,6,8,10) → `prompt_texto` + `prompt_html`.
El cuerpo de `prompt_html` es común; solo cambia el `[FORMATO]`.

### Recurso 1 — 📋 Estudio de Caso (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Redactor de casos de estudio para ciencias de datos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Caso de estudio: narrativa 180 palabras (empresa ficticia, problema concreto, datos), 4 preguntas progresivas (observar->diagnosticar->proponer->evaluar), respuesta_modelo <=50 palabras cada una con razonamiento.
[RESTRICCIONES] Sector reconocible. Datos plausibles. Preguntas que guien razonamiento.
[SALIDA] JSON puro con claves "narrativa","preguntas" (array de 4 con pregunta,respuesta_modelo).
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[ROL] Redactor de casos de estudio para ciencias de datos.
[CURSO] Recurso para un curso universitario de Machine Learning. Audiencia: estudiantes en su primer contacto con el tema, sin formación matemática avanzada. Idioma: español. El recurso debe ser pedagógicamente sólido y técnicamente correcto, pero con lenguaje accesible. Todo ejemplo, dato, analogía o mecánica debe ser específico y fiel al concepto de ML indicado — nunca genérico ni de otro subtema.
[CONCEPTO] "Regresión Lineal"
[TAREA] Caso de estudio: narrativa 180 palabras (empresa ficticia, problema concreto, datos), 4 preguntas progresivas (observar->diagnosticar->proponer->evaluar), respuesta_modelo <=50 palabras cada una con razonamiento.
[RESTRICCIONES] Sector reconocible. Datos plausibles. Preguntas que guien razonamiento.
[SALIDA] JSON puro con claves "narrativa","preguntas" (array de 4 con pregunta,respuesta_modelo).
```

#### Paso 2: prompt_html

```text
[FORMATO] estudio de caso: narrativa destacada, preguntas secuenciales con campo de respuesta y toggle de modelo, barra de progreso, disenio periodistico
```

**Ejemplo completado** (`data_json`):

```text
{
  "narrativa": "La cadena RetailMax quiere prever ventas mensuales según su inversión en publicidad. Tiene 24 meses de datos con gasto e ingresos; sospecha una relación directa pero no la ha cuantificado.",
  "preguntas": [
    {"pregunta": "¿Qué patrón observas entre gasto e ingresos?", "respuesta_modelo": "A mayor gasto, mayores ingresos, de forma aproximadamente proporcional: una relación lineal positiva."},
    {"pregunta": "¿Qué modelo propondrías y por qué?", "respuesta_modelo": "Una regresión lineal: simple, explicable y adecuada para una relación de tendencia recta entre dos variables."}
  ]
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 2 — ✏️ Ejercicio Guiado (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Instructor de ejercicios practicos de ML.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Ejercicio guiado de 5 pasos para aplicar "{concept}". Cada paso: instruccion <=35 palabras, pista opcional, resultado_esperado, validacion de logro.
[RESTRICCIONES] Pasos incrementales, sin saltos logicos. Completables sin frustracion.
[SALIDA] JSON puro con clave "pasos": array de 5 objetos con "numero","instruccion","pista","resultado_esperado","validacion".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] Ejercicio guiado de 5 pasos para aplicar "Regresión Lineal"...
[SALIDA] JSON puro con clave "pasos": array de 5 objetos con "numero","instruccion","pista","resultado_esperado","validacion".
```

#### Paso 2: prompt_html

```text
[FORMATO] ejercicio guiado: pasos numerados, cada uno expandible con pista y validacion, indicador de paso actual, boton siguiente
```

**Ejemplo completado** (`data_json`):

```text
{
  "pasos": [
    {"numero": 1, "instruccion": "Anota los pares (tamaño, precio) de las 6 casas dadas.", "pista": "Usa una tabla de dos columnas.", "resultado_esperado": "6 pares ordenados.", "validacion": "Cada casa tiene tamaño y precio."},
    {"numero": 2, "instruccion": "Dibuja los puntos en un plano y observa la tendencia.", "pista": "Eje X tamaño, eje Y precio.", "resultado_esperado": "Nube ascendente.", "validacion": "Los puntos suben de izquierda a derecha."}
  ]
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 3 — 🛠️ Mini-Proyecto (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Diseniador de mini-proyectos de ML aplicado.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Mini-proyecto: objetivo 50 palabras, 3 entregables evaluables, dataset_sugerido 80 palabras (al menos 8 variables, 50 registros), rubrica con 4 criterios y 3 niveles cada uno (basico/competente/avanzado).
[RESTRICCIONES] Entregables en 8-10 min. Dataset realista y descriptivo.
[SALIDA] JSON puro con claves "objetivo","entregables" (array de 3),"dataset_sugerido","rubrica".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] Mini-proyecto: objetivo 50 palabras... dataset_sugerido 80 palabras (al menos 8 variables, 50 registros)...
[SALIDA] JSON puro con claves "objetivo","entregables","dataset_sugerido","rubrica".
```

#### Paso 2: prompt_html

```text
[FORMATO] mini-proyecto: panel de objetivo, tarjetas de entregables con checklist, dataset colapsable, rubrica interactiva con niveles desplegables
```

**Ejemplo completado** (`data_json`):

```text
{
  "objetivo": "Construir una regresión lineal que prediga el precio de viviendas a partir de su superficie y evaluar su error.",
  "entregables": ["Gráfico de dispersión con la recta ajustada", "Valor de pendiente e intercepto", "Estimación del error promedio"],
  "dataset_sugerido": "50 viviendas con superficie, habitaciones, antigüedad, distancia al centro, baños, garaje, barrio y precio. Relación principal: superficie→precio.",
  "rubrica": {"Ajuste": {"basico": "Recta dibujada a ojo", "competente": "Recta por mínimos cuadrados", "avanzado": "Recta + error reportado"}}
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 4 — 🔬 Simulación Aplicada (direct_code)

#### prompt_codigo (único paso)

```text
[ROL] Desarrollador front-end de simulaciones aplicadas interactivas.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Simulacion HTML5 donde el estudiante aplique "{concept}" en un escenario realista.
[TAREA] Entorno simulado con escenario empresarial concreto, 3-4 parametros ajustables, visualizacion SVG/canvas reactiva, metricas visibles y boton "Aplicar" que ejecuta "{concept}". Iterar al menos 3 veces para descubrir patrones.
[REQUISITOS] HTML5+JS autocontenido. Minimo 300 lineas. Visualizacion <100 ms.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] ← ver sección "Contexto compartido en prompts"
[SCORM] ← ver sección "Contexto compartido en prompts". Llama _scormComplete() tras 3 iteraciones.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[OBJETIVO] Simulacion HTML5 donde el estudiante aplique "Regresión Lineal" en un escenario realista.
[TAREA] Entorno simulado de una inmobiliaria, 3-4 parametros ajustables (pendiente, intercepto, ruido de los datos), scatter SVG reactivo con la recta, metricas visibles (error medio) y boton "Aplicar" que ajusta la recta a los datos. Iterar al menos 3 veces para descubrir patrones.
[REQUISITOS] HTML5+JS autocontenido. Minimo 300 lineas. Visualizacion <100 ms.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS)
[SCORM] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS). Llama _scormComplete() tras 3 iteraciones.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

### Recurso 5 — 📈 Análisis de Datos (direct_code)

#### prompt_codigo (único paso)

```text
[ROL] Desarrollador front-end de dashboards de analisis de datos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Dashboard HTML5 donde el estudiante analice datos de "{concept}" y extraiga conclusiones.
[TAREA] Dataset hardcodeado de 15-20 registros, tabla filtrable/ordenable, 2 graficos SVG (scatter/bar/line) que reaccionan a filtros, 3 preguntas con selector, boton "Revelar insight". Graficos SVG reales.
[REQUISITOS] HTML5+JS autocontenido. Minimo 300 lineas.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] ← ver sección "Contexto compartido en prompts"
[SCORM] ← ver sección "Contexto compartido en prompts". Llama _scormComplete() al responder las 3 preguntas.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[OBJETIVO] Dashboard HTML5 donde el estudiante analice datos de "Regresión Lineal" y extraiga conclusiones.
[TAREA] Dataset hardcodeado de 15-20 registros (superficie, precio, barrio), tabla filtrable/ordenable, 2 graficos SVG (scatter superficie→precio con recta, y barras de precio por barrio) que reaccionan a filtros, 3 preguntas con selector, boton "Revelar insight". Graficos SVG reales.
[REQUISITOS] HTML5+JS autocontenido. Minimo 300 lineas.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS)
[SCORM] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS). Llama _scormComplete() al responder las 3 preguntas.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

### Recurso 6 — 🌳 Escenario Ramificado (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Diseniador de escenarios de decision ramificados.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Escenario ramificado de 3 niveles aplicando "{concept}". Nivel 1: situacion 60 palabras + 2 opciones -> cada una lleva a nivel 2 con nueva situacion + 2 opciones mas. Cada rama final: desenlace 40 palabras + leccion_aprendida conectada con "{concept}".
[RESTRICCIONES] Decisiones no triviales. Todas las ramas pedagogicamente valiosas.
[SALIDA] JSON puro con estructura de arbol: "nodo_raiz" con situacion,opciones (array de 2 con siguiente_nodo,desenlace,leccion_aprendida).
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] Escenario ramificado de 3 niveles aplicando "Regresión Lineal"...
[SALIDA] JSON puro con estructura de arbol: "nodo_raiz" con situacion,opciones...
```

#### Paso 2: prompt_html

```text
[FORMATO] escenario ramificado: tarjeta de situacion con 2 botones, transicion animada entre niveles, desenlace con leccion destacada
```

**Ejemplo completado** (`data_json`):

```text
{
  "nodo_raiz": {
    "situacion": "Te encargan predecir la demanda de un producto. Tienes datos de precio y unidades vendidas. La relación parece recta. ¿Cómo empiezas?",
    "opciones": [
      {"siguiente_nodo": "n2a", "desenlace": "Ajustas una recta precio→ventas y predices bien dentro del rango observado.", "leccion_aprendida": "La regresión lineal funciona cuando la relación es aproximadamente recta."},
      {"siguiente_nodo": "n2b", "desenlace": "Extrapolas la recta a precios extremos y la predicción se dispara sin sentido.", "leccion_aprendida": "Extrapolar fuera del rango de datos es riesgoso en regresión lineal."}
    ]
  }
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 7 — 💻 Lab de Código (direct_code)

#### prompt_codigo (único paso)

```text
[ROL] Desarrollador front-end de laboratorios de codigo interactivo.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Lab de codigo HTML5 donde el estudiante experimente con "{concept}" escribiendo pseudocodigo.
[TAREA] Editor simplificado (textarea), 3 ejercicios crecientes sobre "{concept}" con codigo inicial incompleto, boton "Ejecutar" que valida contra solucion esperada, feedback visual, "Ver solucion" tras 2 intentos. Validacion JS real.
[REQUISITOS] HTML5+JS autocontenido. Minimo 320 lineas.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] ← ver sección "Contexto compartido en prompts"
[SCORM] ← ver sección "Contexto compartido en prompts". Llama _scormComplete() al completar los 3 ejercicios.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[OBJETIVO] Lab de codigo HTML5 donde el estudiante experimente con "Regresión Lineal" escribiendo pseudocodigo.
[TAREA] Editor simplificado (textarea), 3 ejercicios crecientes sobre "Regresión Lineal" (1: calcular y = m*x + b; 2: calcular el residuo de un punto; 3: sumar errores al cuadrado) con codigo inicial incompleto, boton "Ejecutar" que valida contra solucion esperada, feedback visual, "Ver solucion" tras 2 intentos. Validacion JS real.
[REQUISITOS] HTML5+JS autocontenido. Minimo 320 lineas.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS)
[SCORM] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS). Llama _scormComplete() al completar los 3 ejercicios.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

### Recurso 8 — 🧭 Mapa de Problemas (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Facilitador de resolucion de problemas de ML.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Mapa de 4 problemas donde "{concept}" es la solucion. Cada uno: contexto 40 palabras (sector+situacion), 3 sintomas observables, diagnostico (por que "{concept}"), solucion_recomendada 50 palabras.
[RESTRICCIONES] Sectores diversos (salud, finanzas, retail, industria). Sintomas sin jerga experta.
[SALIDA] JSON puro con clave "problemas": array de 4 con "contexto","sintomas" (array de 3),"diagnostico","solucion_recomendada".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] Mapa de 4 problemas donde "Regresión Lineal" es la solucion...
[SALIDA] JSON puro con clave "problemas": array de 4 con "contexto","sintomas","diagnostico","solucion_recomendada".
```

#### Paso 2: prompt_html

```text
[FORMATO] mapa de problemas: grid de 4 tarjetas por sector, expandibles con sintomas+diagnostico+solucion, iconos coloreados
```

**Ejemplo completado** (`data_json`):

```text
{
  "problemas": [
    {"contexto": "Retail: una tienda no sabe cuánto stock pedir según la temporada de ventas.", "sintomas": ["Ventas suben con el calor", "Quiebres de stock en verano", "Exceso en invierno"], "diagnostico": "Relación recta entre temperatura y demanda: ideal para regresión lineal.", "solucion_recomendada": "Ajustar una recta temperatura→ventas y usarla para anticipar pedidos por mes."},
    {"contexto": "Salud: un hospital quiere estimar la estancia según la edad del paciente.", "sintomas": ["Mayores se quedan más días", "Camas mal planificadas", "Costos variables"], "diagnostico": "Tendencia lineal edad→días de estancia.", "solucion_recomendada": "Regresión lineal edad→estancia para planificar capacidad."}
  ]
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 9 — ♟️ Juego de Estrategia (direct_code)

#### prompt_codigo (único paso)

```text
[ROL] Desarrollador front-end de juegos de estrategia educativos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Juego de estrategia HTML5 por turnos que modele la logica de "{concept}" como mecanica.
[TAREA] Tablero/escenario con 5-7 turnos de decision, oponente automatico basado en "{concept}", puntuacion que refleje calidad de decisiones, pantalla final con analisis y consejos. IA oponente funcional.
[REQUISITOS] HTML5+JS autocontenido. Minimo 320 lineas.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] ← ver sección "Contexto compartido en prompts"
[SCORM] ← ver sección "Contexto compartido en prompts". Llama _scormComplete() al terminar la partida.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[OBJETIVO] Juego de estrategia HTML5 por turnos que modele la logica de "Regresión Lineal" como mecanica.
[TAREA] Tablero con puntos dispersos y 5-7 turnos donde el jugador ajusta pendiente e intercepto para reducir el error; un oponente automatico ajusta su propia recta por mínimos cuadrados; puntuacion según cercanía al ajuste óptimo, pantalla final con analisis y consejos. IA oponente funcional.
[REQUISITOS] HTML5+JS autocontenido. Minimo 320 lineas.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS)
[SCORM] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS). Llama _scormComplete() al terminar la partida.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

### Recurso 10 — 🏗️ Reto de Diseño (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Diseniador de retos de arquitectura de soluciones ML.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Reto de disenio: enunciado 80 palabras (cliente realista, problema, restricciones), 4 criterios de disenio, guia_evaluacion con 3 niveles, solucion_referencia 100 palabras.
[RESTRICCIONES] Fuerza trade-offs reales de "{concept}". Sin respuesta unica obvia.
[SALIDA] JSON puro con claves "enunciado","criterios" (array de 4),"guia_evaluacion","solucion_referencia".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] Reto de disenio: enunciado 80 palabras... solucion_referencia 100 palabras.
[SALIDA] JSON puro con claves "enunciado","criterios","guia_evaluacion","solucion_referencia".
```

#### Paso 2: prompt_html

```text
[FORMATO] reto de disenio: enunciado en panel, criterios en checklist, rubrica en acordeon, solucion oculta tras boton con delay
```

**Ejemplo completado** (`data_json`):

```text
{
  "enunciado": "Un cliente bancario quiere un modelo explicable que estime el ingreso de un solicitante a partir de su edad y años de experiencia, con pocos datos y necesidad de justificar cada decisión ante auditoría.",
  "criterios": ["Interpretabilidad", "Pocos datos requeridos", "Justificación auditable", "Bajo costo"],
  "guia_evaluacion": {"basico": "Propone una regresión sin justificar", "competente": "Justifica por interpretabilidad", "avanzado": "Discute límites de la linealidad"},
  "solucion_referencia": "La regresión lineal encaja: pocos datos, alta interpretabilidad y coeficientes auditables. Conviene advertir que asume relaciones rectas y puede fallar si el ingreso crece de forma no lineal con la experiencia."
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

---

## Prompts de generación — EVALUATE

Plantillas exactas de `backend/prometheus/prompts/evaluate_prompts.py`. `CODE_ONLY = {3, 5, 9}` →
`prompt_codigo` (un solo paso). El resto (1,2,4,6,7,8,10) → `prompt_texto` + `prompt_html`.
El cuerpo de `prompt_html` es común; solo cambia el `[FORMATO]`.

### Recurso 1 — ❓ Quiz Interactivo (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Diseniador de quizzes educativos de ML.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Quiz de 6 preguntas sobre "{concept}": enunciado <=40 palabras, 4 opciones (A/B/C/D), respuesta_correcta, feedback_correcto e incorrecto <=20 palabras. Dificultad: 2 faciles, 2 medias, 2 dificiles.
[RESTRICCIONES] Opciones plausibles. Feedback que ensenie, no solo indique error.
[SALIDA] JSON puro con clave "preguntas": array de 6 con "enunciado","opciones","correcta","feedback_correcto","feedback_incorrecto".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[ROL] Diseniador de quizzes educativos de ML.
[CURSO] Recurso para un curso universitario de Machine Learning. Audiencia: estudiantes en su primer contacto con el tema, sin formación matemática avanzada. Idioma: español. El recurso debe ser pedagógicamente sólido y técnicamente correcto, pero con lenguaje accesible. Todo ejemplo, dato, analogía o mecánica debe ser específico y fiel al concepto de ML indicado — nunca genérico ni de otro subtema.
[CONCEPTO] "Regresión Lineal"
[TAREA] Quiz de 6 preguntas sobre "Regresión Lineal": enunciado <=40 palabras, 4 opciones (A/B/C/D), respuesta_correcta, feedback_correcto e incorrecto <=20 palabras. Dificultad: 2 faciles, 2 medias, 2 dificiles.
[RESTRICCIONES] Opciones plausibles. Feedback que ensenie, no solo indique error.
[SALIDA] JSON puro con clave "preguntas": array de 6 con "enunciado","opciones","correcta","feedback_correcto","feedback_incorrecto".
```

#### Paso 2: prompt_html

```text
[FORMATO] quiz interactivo: preguntas secuenciales con botones de opcion, feedback animado, barra de progreso, pantalla de resultados con repaso
```

**Ejemplo completado** (`data_json`):

```text
{
  "preguntas": [
    {"enunciado": "¿Qué describe la regresión lineal?", "opciones": ["Una curva exponencial", "Una recta de mejor ajuste", "Un árbol de decisiones", "Un agrupamiento"], "correcta": "B", "feedback_correcto": "Correcto: traza la recta que mejor resume los datos.", "feedback_incorrecto": "Es una recta, no una curva ni un árbol."},
    {"enunciado": "¿Qué minimiza el método de mínimos cuadrados?", "opciones": ["El número de puntos", "La pendiente", "La suma de errores al cuadrado", "El intercepto"], "correcta": "C", "feedback_correcto": "Exacto: minimiza la suma de residuos al cuadrado.", "feedback_incorrecto": "Piensa en la distancia de los puntos a la recta."}
  ]
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 2 — 📋 Rúbrica de Autoevaluación (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Diseniador de rubricas de autoevaluacion para ML.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Rubrica con 5 criterios sobre "{concept}". Cada uno: descripcion <=25 palabras, 3 niveles (inicial/en desarrollo/logrado) con descriptor <=30 palabras. Puntuacion 1-3. Reflexion final segun rango de puntaje.
[RESTRICCIONES] Criterios auto-evaluables. Descriptores en primera persona ("Puedo...").
[SALIDA] JSON puro con claves "criterios" (array de 5) y "reflexiones" (objeto con rangos).
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] Rubrica con 5 criterios sobre "Regresión Lineal"...
[SALIDA] JSON puro con claves "criterios" (array de 5) y "reflexiones" (objeto con rangos).
```

#### Paso 2: prompt_html

```text
[FORMATO] rubrica interactiva: tabla de criterios con niveles seleccionables, puntuacion automatica, reflexion segun rango, disenio formulario
```

**Ejemplo completado** (`data_json`):

```text
{
  "criterios": [
    {"descripcion": "Explico qué es una regresión lineal", "inicial": "No puedo definirla.", "en_desarrollo": "Puedo definirla con ayuda.", "logrado": "Puedo explicarla con un ejemplo propio."},
    {"descripcion": "Interpreto pendiente e intercepto", "inicial": "No los distingo.", "en_desarrollo": "Distingo uno de los dos.", "logrado": "Interpreto ambos en un caso real."}
  ],
  "reflexiones": {"5-7": "Repasa los conceptos básicos.", "8-12": "Vas por buen camino.", "13-15": "¡Dominas la regresión lineal!"}
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 3 — ⏱️ Desafío Contrarreloj (direct_code)

#### prompt_codigo (único paso)

```text
[ROL] Desarrollador front-end de desafios cronometrados educativos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Desafio contrarreloj HTML5 que evalue dominio de "{concept}" bajo presion de tiempo.
[TAREA] Cronometro regresivo 90 s visible, 8 preguntas secuenciales de opcion multiple sobre "{concept}", puntuacion con bonus por velocidad, barra de progreso, pantalla final con puntaje y feedback por pregunta. Cronometro real setInterval.
[REQUISITOS] HTML5+JS autocontenido. Minimo 300 lineas.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] ← ver sección "Contexto compartido en prompts"
[SCORM] ← ver sección "Contexto compartido en prompts". Llama _scormComplete(puntaje_final) al terminar.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[OBJETIVO] Desafio contrarreloj HTML5 que evalue dominio de "Regresión Lineal" bajo presion de tiempo.
[TAREA] Cronometro regresivo 90 s visible, 8 preguntas secuenciales de opcion multiple sobre "Regresión Lineal" (recta de ajuste, pendiente, intercepto, residuos, mínimos cuadrados, extrapolación...), puntuacion con bonus por velocidad, barra de progreso, pantalla final con puntaje y feedback por pregunta. Cronometro real setInterval.
[REQUISITOS] HTML5+JS autocontenido. Minimo 300 lineas.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS)
[SCORM] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS). Llama _scormComplete(puntaje_final) al terminar.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

### Recurso 4 — 📝 Examen Opción Múltiple (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Examinador de conceptos de Machine Learning.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Examen de 8 preguntas opcion multiple sobre "{concept}": enunciado <=40 palabras, 4 opciones, justificacion <=30 palabras. 2 conceptuales, 2 aplicacion, 2 analisis, 2 relacion. Total 8 puntos.
[RESTRICCIONES] Sin ambiguedades. Distractores verosimiles. Una sola correcta.
[SALIDA] JSON puro con clave "examen": array de 8 con "numero","enunciado","opciones","correcta","justificacion","tipo".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] Examen de 8 preguntas opcion multiple sobre "Regresión Lineal"...
[SALIDA] JSON puro con clave "examen": array de 8 con "numero","enunciado","opciones","correcta","justificacion","tipo".
```

#### Paso 2: prompt_html

```text
[FORMATO] examen formal: preguntas numeradas radiales, navegacion entre preguntas, pantalla de entrega con puntaje y revision
```

**Ejemplo completado** (`data_json`):

```text
{
  "examen": [
    {"numero": 1, "enunciado": "¿Cuál es el objetivo de la regresión lineal?", "opciones": ["Clasificar categorías", "Predecir un valor continuo", "Agrupar datos", "Reducir dimensiones"], "correcta": "B", "justificacion": "Predice una variable numérica continua a partir de otra.", "tipo": "conceptual"},
    {"numero": 2, "enunciado": "Con pendiente 2 e intercepto 5, ¿qué predice para x=3?", "opciones": ["6", "11", "8", "15"], "correcta": "B", "justificacion": "y = 2·3 + 5 = 11.", "tipo": "aplicacion"}
  ]
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 5 — ✍️ Completar Espacios (direct_code)

#### prompt_codigo (único paso)

```text
[ROL] Desarrollador front-end de ejercicios de completar espacios.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Ejercicio HTML5 de completar espacios que evalue vocabulario de "{concept}".
[TAREA] 8 oraciones sobre "{concept}" con espacio en blanco, validacion flexible (ignora mayusculas/acentos), feedback inmediato con correccion, barra de progreso, puntaje y boton "Reintentar". Validacion JS real.
[REQUISITOS] HTML5+JS autocontenido. Minimo 280 lineas.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] ← ver sección "Contexto compartido en prompts"
[SCORM] ← ver sección "Contexto compartido en prompts". Llama _scormComplete(puntaje_final) al completar.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[OBJETIVO] Ejercicio HTML5 de completar espacios que evalue vocabulario de "Regresión Lineal".
[TAREA] 8 oraciones sobre "Regresión Lineal" con espacio en blanco (p. ej. "La ____ mide cuánto sube y por cada unidad de x" → pendiente), validacion flexible (ignora mayusculas/acentos), feedback inmediato con correccion, barra de progreso, puntaje y boton "Reintentar". Validacion JS real.
[REQUISITOS] HTML5+JS autocontenido. Minimo 280 lineas.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS)
[SCORM] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS). Llama _scormComplete(puntaje_final) al completar.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

### Recurso 6 — 🔗 Relacionar Conceptos (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Diseniador de ejercicios de asociacion conceptual.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] 6 parejas: columna A (definiciones), columna B (terminos de "{concept}"). Relacion 1:1. Cada pareja: feedback_acierto <=20 palabras, feedback_error <=20 palabras (pista sin revelar).
[RESTRICCIONES] Sin ambiguedad. Terminos y definiciones precisos. Sin pistas en la redaccion.
[SALIDA] JSON puro con claves "columna_a" (array de 6) y "parejas" (array de 6 con a_index,b_termino,feedback_acierto,feedback_error).
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] 6 parejas: columna A (definiciones), columna B (terminos de "Regresión Lineal"). Relacion 1:1...
[SALIDA] JSON puro con claves "columna_a" y "parejas".
```

#### Paso 2: prompt_html

```text
[FORMATO] relacionar conceptos: 2 columnas (definiciones + terminos arrastrables), conexiones visuales, contador de aciertos, feedback por pareja
```

**Ejemplo completado** (`data_json`):

```text
{
  "columna_a": ["Inclinación de la recta", "Valor de y cuando x=0", "Distancia de un punto a la recta", "Método que minimiza errores al cuadrado", "Variable que se predice", "Variable usada para predecir"],
  "parejas": [
    {"a_index": 0, "b_termino": "Pendiente", "feedback_acierto": "✓ La pendiente es la inclinación.", "feedback_error": "✗ Piensa en qué tan empinada va la recta."},
    {"a_index": 1, "b_termino": "Intercepto", "feedback_acierto": "✓ El intercepto corta el eje y.", "feedback_error": "✗ ¿Dónde empieza la recta en x=0?"}
  ]
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 7 — 🧩 Crucigrama Conceptual (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Creador de crucigramas educativos de ML.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Crucigrama de 8 terminos de "{concept}": numero, orientacion, longitud, pista <=25 palabras, respuesta. Cuadricula interconectada (>=4 cruces). Pistas ingeniosas pero justas.
[RESTRICCIONES] Terminos reales. Sin abreviaturas.
[SALIDA] JSON puro con clave "entradas": array de 8 con "numero","orientacion","longitud","pista","respuesta".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] Crucigrama de 8 terminos de "Regresión Lineal"...
[SALIDA] JSON puro con clave "entradas": array de 8 con "numero","orientacion","longitud","pista","respuesta".
```

#### Paso 2: prompt_html

```text
[FORMATO] crucigrama interactivo: cuadricula SVG, teclado en pantalla, pistas laterales que se iluminan al completar, animacion de completado
```

**Ejemplo completado** (`data_json`):

```text
{
  "entradas": [
    {"numero": 1, "orientacion": "horizontal", "longitud": 9, "pista": "Inclinación de la recta de ajuste.", "respuesta": "PENDIENTE"},
    {"numero": 2, "orientacion": "vertical", "longitud": 8, "pista": "Diferencia entre el valor real y el predicho.", "respuesta": "RESIDUO"}
  ]
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 8 — 💬 Preguntas de Desarrollo (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Evaluador de comprension profunda de ML.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] 3 preguntas de desarrollo sobre "{concept}": enunciado <=50 palabras (abierto), 3-4 criterios de evaluacion observables, respuesta_modelo <=80 palabras.
[RESTRICCIONES] No respondibles con si/no. Criterios evaluables objetivamente.
[SALIDA] JSON puro con clave "preguntas": array de 3 con "enunciado","criterios","respuesta_modelo".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] 3 preguntas de desarrollo sobre "Regresión Lineal"...
[SALIDA] JSON puro con clave "preguntas": array de 3 con "enunciado","criterios","respuesta_modelo".
```

#### Paso 2: prompt_html

```text
[FORMATO] preguntas de desarrollo: enunciados con campo expandible, criterios como checklist, respuesta modelo oculta tras boton 'Comparar'
```

**Ejemplo completado** (`data_json`):

```text
{
  "preguntas": [
    {"enunciado": "Explica cuándo la regresión lineal sería una mala elección de modelo y por qué.", "criterios": ["Identifica relaciones no lineales", "Menciona outliers", "Argumenta con un ejemplo"], "respuesta_modelo": "Cuando la relación entre variables es curva o hay outliers fuertes, una recta no captura el patrón y produce predicciones sesgadas; por ejemplo, el crecimiento que se aplana con el tiempo."},
    {"enunciado": "¿Por qué se elevan al cuadrado los errores al ajustar la recta?", "criterios": ["Menciona penalizar errores grandes", "Evita cancelación de signos", "Claridad"], "respuesta_modelo": "Elevar al cuadrado evita que errores positivos y negativos se cancelen y penaliza más los desvíos grandes, guiando hacia la mejor recta."}
  ]
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

### Recurso 9 — 🎯 Simulación Evaluativa (direct_code)

#### prompt_codigo (único paso)

```text
[ROL] Desarrollador front-end de simulaciones evaluativas.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[OBJETIVO] Simulacion evaluativa HTML5 donde el estudiante demuestre dominio practico de "{concept}".
[TAREA] Escenario profesional concreto, 3-4 decisiones evaluables mediante controles interactivos, evaluacion contra criterios objetivos de "{concept}", puntuacion con pesos, reporte final con fortalezas y areas de mejora.
[REQUISITOS] HTML5+JS autocontenido. Minimo 320 lineas. Evaluacion real basada en criterios.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] ← ver sección "Contexto compartido en prompts"
[SCORM] ← ver sección "Contexto compartido en prompts". Llama _scormComplete(puntaje_final) al finalizar.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[OBJETIVO] Simulacion evaluativa HTML5 donde el estudiante demuestre dominio practico de "Regresión Lineal".
[TAREA] Escenario de un analista que debe predecir ventas, 3-4 decisiones evaluables (elegir variables, ajustar la recta, detectar un outlier, decidir si extrapolar) mediante controles interactivos, evaluacion contra criterios objetivos de "Regresión Lineal", puntuacion con pesos, reporte final con fortalezas y areas de mejora.
[REQUISITOS] HTML5+JS autocontenido. Minimo 320 lineas. Evaluacion real basada en criterios.
[SISTEMA_DE_DISEÑO_OBLIGATORIO] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS)
[SCORM] (expandido: ver utils.py DESIGN_SYSTEM / SCORM_JS). Llama _scormComplete(puntaje_final) al finalizar.
[SALIDA] Solo el HTML completo desde <!DOCTYPE html>, sin markdown.
```

### Recurso 10 — 🏆 Diploma de Logro (two_step)

#### Paso 1: prompt_texto

```text
[ROL] Diseniador de diplomas y certificados educativos.
[CURSO] {CURSO_CONTEXTO}
[CONCEPTO] "{concept}"
[TAREA] Diploma de logro por "{concept}": titulo <=20 palabras, descripcion_logro <=50 palabras, 3 competencias_adquiridas, firma_simulada, diseno_sugerido (paleta, iconos, tipografia).
[RESTRICCIONES] Tono celebratorio profesional. Competencias medibles y reales.
[SALIDA] JSON puro con claves "titulo","descripcion_logro","competencias","firma","diseno_sugerido".
```

**Ejemplo completado** (`concept = "Regresión Lineal"`):

```text
[TAREA] Diploma de logro por "Regresión Lineal"...
[SALIDA] JSON puro con claves "titulo","descripcion_logro","competencias","firma","diseno_sugerido".
```

#### Paso 2: prompt_html

```text
[FORMATO] diploma de logro: certificado estilizado con borde SVG, concepto destacado, competencias en lista, paleta dorada/azul, boton descargar
```

**Ejemplo completado** (`data_json`):

```text
{
  "titulo": "Certificado de Dominio en Regresión Lineal",
  "descripcion_logro": "Otorgado por completar con éxito el módulo de Regresión Lineal, demostrando capacidad para ajustar, interpretar y aplicar modelos lineales a datos reales.",
  "competencias": ["Ajustar una recta por mínimos cuadrados", "Interpretar pendiente e intercepto", "Reconocer cuándo el modelo lineal es adecuado"],
  "firma": "Dr. A. Modelo — Coordinador del curso de Machine Learning",
  "diseno_sugerido": {"paleta": "dorado y azul marino", "iconos": "🏆 📈", "tipografia": "serif elegante para títulos"}
}
```
(Cuerpo idéntico; `[SISTEMA_DE_DISEÑO_OBLIGATORIO]` y `[SCORM]` expandidos: ver utils.py DESIGN_SYSTEM / SCORM_JS.)

---

## Ver también

- [Labs — Iteración de prompts](labs.md) — Sandbox para probar y mejorar prompts de cada recurso.
- [API Reference](api.md) — Endpoints REST del pipeline (`POST /api/ova/generate`, etc.).
- [Database](database.md) — Esquema de tablas relacionadas (`ovas`, `ova_phases`, `rag_chunks`).

---

*Fuentes: `backend/prometheus/` (graph, state, nodes, plans, checkpointer),
`backend/prometheus/prompts/` (engage_prompts — evaluate_prompts) y `backend/llm/` (router, html_validator, utils, podcast).*
