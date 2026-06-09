# Prometheus — Arquitectura Multi-Agente

> Metodología Prometheus aplicada a la generación de OVAs educativos mediante un sistema
> BDI multi-agente orquestado con **LangGraph**. El pipeline descompone un prompt del
> usuario en recursos por fase 5E, los genera con agentes especializados y los ensambla
> en un paquete SCORM autocontenido.

---

## Resumen

GenOVA implementa la metodología **Prometheus** — un proceso detallado e iterativo de
ingeniería para sistemas multi-agente BDI (*Belief-Desire-Intention*) — usando LangGraph
como *framework* de orquestación. Los 3 niveles de diseño de Prometheus se mapean
directamente a paquetes de código en `backend/prometheus/`.

Cada job de generación de OVA lanza un grafo de 8 nodos que recorren las 5 fases de la
metodología 5E: el **concierge** descompone el prompt del usuario, los **agentes de fase**
generan recursos HTML5 individuales, el **validador** revisa calidad y SCORM, y el
**ensamblador** construye el paquete final.

---

## Por qué LangGraph (no LangChain / CrewAI / AutoGen)

LangGraph se eligió porque modela agentes como nodos de un grafo dirigido con **estado
compartido tipado**, enrutamiento condicional y checkpointing integrado — un calce natural
para el nivel de diseño arquitectónico de Prometheus, sin la sobrecarga de *frameworks*
más pesados.

| Alternativa | Por qué se descartó |
|---|---|
| **LangChain** | AgentExecutor es opaco; no expone el estado interno ni permite enrutamiento condicional fino. |
| **CrewAI** | Abstracción de "crew" con roles fijos; la topología de comunicación agente↔agente no es controlable. |
| **AutoGen** | Orientado a chat multi-turno entre agentes; no modela un pipeline determinista de generación. |

El sistema de jobs existente (`OvaJob` / `OvaJobResource`) ya proveía persistencia de
estado; el `PostgresSaver` de LangGraph lo complementa con checkpointing a nivel de hilo
(`thread_id = job_id`), habilitando resume futuro si el proceso se interrumpe.

---

## Los 3 niveles de diseño Prometheus

La metodología Prometheus especifica un sistema multi-agente en 3 niveles de abstracción
que van de lo conceptual a lo detallado. GenOVA implementa cada nivel en un conjunto
acotado de archivos.

### Nivel 1 — Especificación del sistema

**Conceptos**: metas (*goals*), escenarios, percepciones, acciones.

**Código**: `concierge_node` (`backend/prometheus/nodes/concierge.py`, 99 líneas).

El **concierge** es el agente de especificación del sistema. Recibe el prompt del usuario
(meta), usa el LLM *orquestador* (`openai/gpt-oss-120b`, `reasoning_effort: medium`) para
descomponerlo en metas de recursos por fase (escenarios), y produce dos salidas:

- `phases`: dict `{phase_type: [{"resource_type": int, "resource_order": int}, ...]}`
- `phase_order`: lista ordenada de fases activas (ej. `["engage", "explore", ...]`)

Si el LLM falla, el concierge recurre a `_FALLBACK_PLAN`, un plan determinista de 4
recursos por fase que garantiza que el pipeline nunca se bloquea.

El catálogo de recursos (`_RESOURCE_CATALOG`) lista los 50 tipos disponibles (10 por cada
una de las 5 fases 5E). El LLM orquestador selecciona entre 2 y 4 por fase según el tema,
nivel y énfasis del prompt.

### Nivel 2 — Diseño arquitectónico

**Conceptos**: tipos de agente, protocolos de interacción, diagrama de sistema.

**Código**: `graph.py` (113 líneas) — `StateGraph` con 8 nodos.

#### Tipos de agente

| Agente | Nodo | Rol Prometheus |
|---|---|---|
| **EngageAgent** | `engage_node` | Genera recursos de enganche (cómic, juego, dilema…) |
| **ExploreAgent** | `explore_node` | Genera recursos de exploración (lab, mapa mental…) |
| **ExplainAgent** | `explain_node` | Genera recursos teóricos (video, FAQ, diagrama…) |
| **ElaborateAgent** | `elaborate_node` | Genera recursos de aplicación (caso, proyecto, simulación…) |
| **EvaluateAgent** | `evaluate_node` | Genera recursos de evaluación (quiz, examen, desafío…) |
| **Validator** | `validate_node` | Valida HTML generado (SCORM, estructura, CDN) |
| **Assembler** | `assemble_node` | Construye el OVA y paquete SCORM |

#### Protocolo de comunicación

**Estrictamente concierge ↔ agentes**. Los agentes de fase no se comunican entre sí. Esto
se fuerza mediante la topología de aristas del grafo:

```
ENTRY → concierge → engage ─┐
                   → explore ─┤
                   → explain ─┼→ validate → [retry|next_phase|assemble] → END
                   → elaborate┤
                   → evaluate ─┘
```

- **Arista condicional desde concierge**: `_route_next_phase` lee `phase_order` y
  `current_phase_idx` para decidir a qué fase saltar.
- **Arista directa fase → validate**: cada fase entrega al validador exactamente un recurso.
- **Arista condicional desde validate**: `_check_validation` decide si reintentar el mismo
  recurso, avanzar a la siguiente fase (vía concierge) o ensamblar.

### Nivel 3 — Diseño detallado

**Conceptos**: capacidades, eventos internos, planes, creencias/datos.

**Código**: `plans/*.py`, `tools/*.py`, `state.py`.

#### Capacidades

| Capacidad | Implementación | Descripción |
|---|---|---|
| **ResourceGeneration** | `plans/two_step.py`, `direct_code.py`, `podcast.py` | Genera HTML5 educativo según el tipo de recurso |
| **ContextRetrieval** | `tools/rag_search.py` | Recupera contexto semántico desde archivos subidos por el usuario |
| **HTMLValidation** | `agents/html_validator.py` | Valida estructura, SCORM, longitud, CDNs prohibidos + auto-reparación |

#### Planes de generación

Cada agente de fase selecciona el plan según el `resource_type`:

| Plan | Archivo | Recurso típico | Pipeline |
|---|---|---|---|
| **two_step_gen** | `plans/two_step.py` | Cómic, juego, timeline… | LLM texto → JSON estructurado → LLM código → HTML |
| **direct_code_gen** | `plans/direct_code.py` | Simulador, diagrama, infografía… | LLM código → HTML (un solo paso) |
| **podcast_gen** | `plans/podcast.py` | Micro-Podcast (ENGAGE tipo 3) | LLM monólogo → TTS Groq → reproductor HTML |

Los planes son **agnósticos de fase**: despachan al módulo de prompts correcto
(`engage_prompts`, `explore_prompts`, etc.) mediante carga *lazy* cacheada.

#### Eventos internos (implícitos vía transiciones de estado)

Prometheus define `ResourceGenerated`, `ValidationFailed` y `PhaseComplete` como eventos.
En LangGraph estos son **implícitos**: cada nodo devuelve un dict parcial que el runtime
fusiona en el estado compartido, y las aristas condicionales leen ese estado para enrutar.

#### Creencias / datos

`OvaGenerationState` (`state.py`, 34 líneas) es un `TypedDict` que actúa como **modelo
mental compartido** del sistema multi-agente. LangGraph fusiona automáticamente los
retornos parciales de cada nodo.

---

## Modelo BDI

La triada *Belief-Desire-Intention* de Prometheus se mapea directamente al código:

| Concepto BDI | Código | Descripción |
|---|---|---|
| **Beliefs** (creencias) | `state.py` → `OvaGenerationState` | Estado compartido: `prompt`, `phases`, `results`, `errors`, `progress`, `rag_context`… |
| **Desires** (deseos) | `concierge_node` → `phases` | Metas de recursos por fase derivadas del prompt del usuario |
| **Intentions** (intenciones) | `plans/*.py` → `two_step_gen`, `direct_code_gen`, `podcast_gen` | Plan concreto que ejecuta cada agente de fase |

**Ciclo BDI**:
```
State (Belief) → Concierge descompone prompt (Desire) → Agente de fase selecciona plan (Intention)
```

El estado inicial se construye en `jobs_runner.py` a partir de los parámetros del job. El
concierge lo enriquece con el plan de fases. Cada agente de fase consume el estado, ejecuta
su plan y devuelve resultados que se acumulan en `results` y `errors`.

---

## Ciclo PEVR

Cada agente de fase implementa el ciclo **Perceive-Evaluate-Verify-Respond** de Prometheus:

| Paso | Acción | Código |
|---|---|---|
| **Perceive** | Recupera contexto RAG si hay `upload_ids` | `tools/rag_search.py` → trunca a 3000 caracteres |
| **Evaluate** | Selecciona el plan según `resource_type` y evalúa modelo vía `llm_config` + `enabled_models` | Cada `*_node` → `two_step_gen` / `direct_code_gen` / `podcast_gen` |
| **Verify** | Valida HTML (SCORM, estructura, longitud, CDNs) + auto-repara | `validate_node` → `validate_and_repair()` |
| **Respond** | Llama al LLM con cadenas de fallback y backoff exponencial | `tools/llm_generate.py` → `generar_texto()` |

El lazo PEVR se cierra en el grafo: `validate → conditional retry → mismo phase agent`.
Si la validación falla y el recurso aún no alcanzó `MAX_ATTEMPTS` (3 por defecto), el
grafo reencamina al mismo agente de fase para reintentar.

---

## Estructura LangGraph

### Nodos

```python
StateGraph(OvaGenerationState)
  ├── "concierge"     # descompone prompt → plan de fases
  ├── "engage"        # genera 1 recurso ENGAGE
  ├── "explore"       # genera 1 recurso EXPLORE
  ├── "explain"       # genera 1 recurso EXPLAIN
  ├── "elaborate"     # genera 1 recurso ELABORATE
  ├── "evaluate"      # genera 1 recurso EVALUATE
  ├── "validate"      # valida + auto-repara HTML
  └── "assemble"      # construye OVA/SCORM final
```

### Propiedades del estado (`OvaGenerationState`)

| Campo | Tipo | Descripción |
|---|---|---|
| `prompt` | `str` | Prompt/concepto del usuario |
| `upload_ids` | `list[str]` | IDs de archivos subidos para RAG |
| `llm_config` | `dict` | Override de modelo por tarea |
| `enabled_models` | `list[dict]` | Modelos habilitados (filtro `OVA_ENABLED_LLMS`) |
| `phases` | `dict` | `{phase_type: [{resource_type, resource_order}]}` |
| `phase_order` | `list[str]` | Orden de fases activas |
| `current_phase_idx` | `int` | Índice de la fase actual |
| `current_resource_idx` | `int` | Índice del recurso actual dentro de la fase |
| `total_resources` | `int` | Total de recursos planificados |
| `progress` | `int` | Recursos procesados (éxito + error) |
| `rag_context` | `str` | Contexto RAG truncado a 3000 caracteres |
| `results` | `Annotated[list[dict], add_messages]` | Resultados acumulados `[{phase, html, resource_type, title}]` |
| `errors` | `Annotated[list[dict], add_messages]` | Errores acumulados `[{phase, resource_type, error}]` |
| `scorm_zip_path` | `str` | Ruta del ZIP SCORM generado |
| `ova_status` | `str` | `"listo"`, `"borrador"` o `"error"` |

`results` y `errors` usan el *reducer* `add_messages` de LangGraph, que concatena listas
en cada retorno parcial en lugar de reemplazarlas.

### Funciones de enrutamiento condicional

| Función | Origen | Destinos posibles | Lógica |
|---|---|---|---|
| `_route_next_phase` | `concierge` | `engage/explore/explain/elaborate/evaluate/assemble` | Lee `phase_order[current_phase_idx]` |
| `_check_validation` | `validate` | `engage/.../evaluate/next_phase/assemble` | Si `done >= total` → `next_phase`; si error sin resultados → `next_phase` o `assemble`; si no → reintentar misma fase |

### Tipos de arista

| Tipo | Ejemplo | Propósito |
|---|---|---|
| **Directa** | `engage → validate` | Cada fase entrega al validador |
| **Condicional** | `concierge → fases` | El concierge decide la primera/ siguiente fase |
| **Condicional** | `validate → retry/next/assemble` | El validador decide reintentar o avanzar |
| **Terminal** | `assemble → END` | Fin del grafo |

### Flujo completo

```
ENTRY
  │
  ▼
concierge ──→ _route_next_phase ──→ engage ──→ validate ──→ _check_validation
                │                    explore       ▲              │
                │                    explain        │   ┌─────────┤
                │                    elaborate      │   │ retry   │ next_phase
                │                    evaluate       │   │ (misma  │ (vuelve a
                │                    assemble ──────┘   │  fase)  │  concierge)
                │                                      │         │
                │                                      └─────────┤ assemble
                └────────────────────────────────────────────────→ END
```

El grafo itera **un recurso por invocación de nodo**. Si una fase tiene 4 recursos,
el ciclo `engage → validate → retry → engage` se repite hasta agotar los 4 o alcanzar
`MAX_ATTEMPTS` por recurso. Luego `_check_validation` retorna `next_phase`, que reencamina
al concierge para avanzar `current_phase_idx`.

---

## Checkpointing

LangGraph ofrece checkpointing automático del estado después de cada *superstep* (nodo).
GenOVA lo configura en `backend/prometheus/checkpointer.py` (28 líneas):

| Entorno | Checkpointer | Condición |
|---|---|---|
| **Producción** | `PostgresSaver` (misma DB Supabase) | `DATABASE_URL` configurada |
| **Desarrollo / test** | `MemorySaver` (en memoria) | Sin `DATABASE_URL` (`MemorySaver` es el fallback) |

El `thread_id` se iguala a `str(job_id)`, lo que **habilitaría** reanudar un job desde el
último checkpoint si el proceso se interrumpiera. En la implementación actual, el runner
siempre arranca desde un estado fresco; la infraestructura de checkpointing está lista
para un futuro resume.

La tabla de checkpoints la crea `PostgresSaver` *lazy* en el primer uso — no requiere
migración manual.

---

## Integración con el sistema de jobs

`backend/ova/jobs_runner.py` (188 líneas) es el puente entre el modelo de jobs y el grafo
Prometheus:

```
1. POST /api/ova/jobs → crea OvaJob + OvaJobResource rows (status="pending")
2. jobs_router lanza run_job(job_id) en thread background
3. jobs_runner construye initial_state desde job.params
4. invoke_ova_generation(initial_state, str(job_id))
5. _persist_results: mapea results/errors del grafo a OvaJobResource rows
6. _finish_job: status → "done" | "error"
7. _materialize: construye OVA/SCORM desde recursos "done"
```

### Dos sistemas paralelos

| Sistema | Archivo | Uso |
|---|---|---|
| **Prometheus LangGraph** (primario) | `jobs_runner.py` → `prometheus.graph` | Generación completa de OVA (todos los recursos de todas las fases) |
| **Legado directo** (edición) | `jobs_runner_exec.py` → `regen_agents.py` | Regeneración de un solo recurso en modo edición |

El sistema legado se mantiene para el flujo de edición, donde el usuario regenera un
recurso individual sin pasar por todo el grafo. Ambos comparten el modelo `OvaJob` y la
tabla `OvaJobResource`.

### Modelo de datos

| Tabla | Columnas clave |
|---|---|
| `OvaJob` | `id` (UUID), `status`, `prompt`, `params` (JSONB: `llm_config`, `upload_ids`, `enabled_models`) |
| `OvaJobResource` | `phase_type`, `resource_type`, `status`, `attempts`, `content` (HTML) |

---

## Capa de herramientas

Las herramientas del agente están en `backend/prometheus/tools/` y son *wrappers*
delgados sobre funciones existentes del sistema:

### `llm_generate` (`tools/llm_generate.py`, 18 líneas)

Wrapper sobre `generar_texto()` de `agents/llm_router.py`. Enruta al proveedor y modelo
correcto según la tarea (`texto`, `codigo`, `orquestador`, `razonamiento`) y aplica
cadenas de fallback con **backoff exponencial** (máx 8 s) ante errores recuperables
(rate-limit, 402 sin crédito, 5xx, contenido vacío de modelos de razonamiento).

```python
def llm_generate(prompt, task="codigo", max_tokens=12000, llm_config=None, enabled_models=None) -> str:
    return generar_texto(prompt, task, max_tokens, llm_config, enabled_models)
```

### `rag_search` (`tools/rag_search.py`, 18 líneas)

*Lazy-importa* `rag.retriever.retrieve_context`, ejecuta búsqueda semántica sobre los
chunks del usuario y trunca el resultado a **3000 caracteres**. Retorna `""` si falla
— nunca bloquea la generación.

```python
def rag_search(query: str, phase: str = "engage") -> str:
    result = retrieve_context(query)
    return result[:3000] if result else ""
```

### `validate_and_repair` (`agents/html_validator.py`)

Invocado dentro de los planes de generación (no como nodo independiente del grafo). Revisa:

1. `<!DOCTYPE html>` presente
2. Cierres `</html>` / `</script>` (detecta truncado)
3. **Callbacks SCORM**: `_scormInit`, `_scormComplete`, `cmi.core.lesson_status`
4. Longitud mínima por fase y tipo (`_MIN_CHARS`)
5. Sin CDNs externos prohibidos (jsDelivr, unpkg, jQuery, Bootstrap, Google Fonts…)

Auto-repara cierres faltantes e inyecta los callbacks SCORM antes de `</body>`. Las
fallas nunca bloquean — el HTML se entrega con metadata `quality_checks`.

---

## Dependencias

```
langgraph>=0.6.0
langgraph-checkpoint-postgres>=2.0.0
```

Ambas declaradas en `backend/requirements.txt`. En el arranque de FastAPI (`lifespan`),
el sistema ejecuta refresco del catálogo de modelos y migraciones pendientes.

---

## Inventario de archivos

| Archivo | Rol | Líneas |
|---|---|---|
| `backend/prometheus/__init__.py` | Exporta `build_ova_graph`, `invoke_ova_generation` | 2 |
| `backend/prometheus/graph.py` | Construye y compila el StateGraph de 8 nodos; funciones de enrutamiento condicional | 113 |
| `backend/prometheus/state.py` | `OvaGenerationState` TypedDict — modelo de creencias BDI compartido | 34 |
| `backend/prometheus/checkpointer.py` | `get_checkpointer()` → `PostgresSaver` o `MemorySaver` según `DATABASE_URL` | 28 |
| `backend/prometheus/nodes/__init__.py` | Re-exporta todos los node functions | 9 |
| `backend/prometheus/nodes/concierge.py` | Nodo concierge: descompone prompt en plan de fases + fallback determinista | 99 |
| `backend/prometheus/nodes/engage.py` | Agente ENGAGE: selecciona plan (2-step / podcast / direct) según resource_type | 55 |
| `backend/prometheus/nodes/explore.py` | Agente EXPLORE: código directo para tipos {1,6,10}, 2-step para el resto | 50 |
| `backend/prometheus/nodes/explain.py` | Agente EXPLAIN: código directo para tipos {3,5,8,10}, 2-step para el resto | 48 |
| `backend/prometheus/nodes/elaborate.py` | Agente ELABORATE: código directo para tipos {4,5,7,9}, 2-step para el resto | 48 |
| `backend/prometheus/nodes/evaluate.py` | Agente EVALUATE: código directo para tipos {3,5,9}, 2-step para el resto | 48 |
| `backend/prometheus/nodes/validate.py` | Nodo validador: invoca `validate_and_repair` sobre el último resultado | 30 |
| `backend/prometheus/nodes/assemble.py` | Nodo ensamblador: construye estructura de fases para SCORM (terminal) | 33 |
| `backend/prometheus/plans/__init__.py` | Re-exporta `two_step_gen`, `direct_code_gen`, `podcast_gen` | 4 |
| `backend/prometheus/plans/two_step.py` | Plan 2 pasos: texto → JSON → HTML + validación | 64 |
| `backend/prometheus/plans/direct_code.py` | Plan directo: una sola llamada LLM → HTML + validación | 48 |
| `backend/prometheus/plans/podcast.py` | Plan podcast: monólogo → TTS Groq → reproductor HTML | 22 |
| `backend/prometheus/tools/__init__.py` | Re-exporta `llm_generate`, `rag_search` | 3 |
| `backend/prometheus/tools/llm_generate.py` | Wrapper delgado sobre `generar_texto()` con fallback y backoff | 18 |
| `backend/prometheus/tools/rag_search.py` | Búsqueda semántica RAG con truncado a 3000 caracteres | 18 |
| `backend/ova/jobs_runner.py` | Runner background: estado inicial → grafo → persistencia → materialización | 188 |
| `backend/ova/jobs_runner_exec.py` | Runner legado para regeneración individual en modo edición | ~120 |

**Total**: ~1,100 líneas en el paquete `prometheus/` + runner.

---

## Referencias

- [fases-5e.md](fases-5e.md) — Pipeline 5E completo (50 recursos, LangGraph, PEVR, validación)
- [catalogo-modelos.md](catalogo-modelos.md) — Catálogo de modelos LLM (curado, APIs, enable/disable, asignación por tarea)
- [labs.md](labs.md) — Sandbox de iteración de prompts que comparte la capa de herramientas (`generar_texto`, `validate_and_repair`)
- [api.md](api.md) — Endpoints REST del sistema de jobs (`POST /api/ova/jobs`)
- `sdd/specs/EP-5_prometheus-langgraph.md` — Spec de la feature
- `sdd/specs/EN-003_jobs-background-generation.md` — Spec del runner background
- `sdd/specs/EN-013_resource-generation-with-retries.md` — Spec de reintentos por recurso
