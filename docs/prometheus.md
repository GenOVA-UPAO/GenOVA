# Prometheus — Motor multi-agente de generación de OVAs

> **Prometheus** es el nombre interno del motor de generación de OVAs de GenOVA, construido
> sobre **LangGraph**. Descompone el prompt del usuario en recursos por fase 5E, los genera
> con LLMs reales en paralelo y los ensambla en un paquete SCORM 1.2.
>
> **Diseño vs. runtime (léelo primero)**: hay **dos capas** y conviene no confundirlas.
> 1. **Capa de diseño** — la metodología **Prometheus (AOSE)** de Padgham & Winikoff, elegida
>    para *diseñar* los agentes. Especifica el sistema en 3 fases y se modela con la triada
>    **BDI** (*Belief-Desire-Intention*). Ver [Diseño de agentes — metodología Prometheus](#diseño-de-agentes--metodología-prometheus-aose).
> 2. **Capa de runtime** — ese diseño se **implementa** como un **pipeline orquestador-trabajadores**
>    determinista sobre LangGraph, con estado compartido tipado. Ver [Núcleo real](#núcleo-real-de-la-metodología).
>
> No hay un *motor* BDI ejecutándose (sin revisión de creencias ni deliberación dinámica de
> deseos): eso es deliberado e innecesario para generación determinista de contenido. La capa
> de diseño es legítima; el runtime simplemente la realiza de forma acotada.

| Archivo | Rol |
|---|---|
| `backend/prometheus/graph.py` | Construye el `StateGraph` (7 nodos + router condicional) |
| `backend/prometheus/state.py` | `OvaGenerationState` TypedDict compartido |
| `backend/prometheus/runtime.py` | `run_phase`: generación paralela acotada + persistencia en vivo |
| `backend/prometheus/nodes/concierge.py` | Descompone el prompt en plan de recursos por fase |
| `backend/prometheus/nodes/engage.py` … `evaluate.py` | Nodos de fase: despachan plan por `resource_type` |
| `backend/prometheus/nodes/assemble.py` | Nodo terminal: prepara las fases para SCORM |
| `backend/prometheus/plans/two_step.py` | Plan 2 pasos (texto → HTML) |
| `backend/prometheus/plans/direct_code.py` | Plan directo (HTML en 1 paso) |
| `backend/prometheus/plans/podcast.py` | Plan podcast (monólogo → TTS → HTML) |
| `backend/prometheus/refine.py` | Pase crítico opcional (1 corrección dirigida por recurso) |
| `backend/prometheus/checkpointer.py` | Checkpointer LangGraph (MemorySaver / PostgresSaver opt-in) |
| `backend/generation/jobs_runner.py` | Runner background: estado inicial → grafo → persistencia → materialización |
| `backend/llm/html_validator.py` | Validación + auto-reparación de HTML (dentro de los planes) |

---

## Resumen

Cada job de generación arranca un grafo LangGraph de **7 nodos**: `concierge` descompone el
prompt en un plan de recursos por fase 5E; los **5 nodos de fase** (engage, explore, explain,
elaborate, evaluate) generan **todos** los recursos de su fase en paralelo acotado; `assemble`
cierra el grafo. Cada recurso se genera con LLMs reales (Groq + OpenRouter) usando uno de tres
planes, se valida/repara de forma determinista y, opcionalmente, pasa por un crítico LLM que
corrige defectos puntuales.

El progreso se persiste **a nivel de fila `OvaJobResource`** a medida que cada recurso termina
(no al final), de modo que el polling del front refleja avance real. El checkpointing de
LangGraph está, por defecto, en memoria — la reanudación real no usa checkpoints del grafo
sino el estado en la base de datos (ver [Checkpointing](#checkpointing)).

---

## Arquitectura del grafo

```
START
  │
  ▼
concierge ──_route_next_phase──▶ engage ─────┐
                                 explore      │  cada nodo de fase:
                                 explain      │   • genera TODOS sus recursos
                                 elaborate    │     en paralelo (run_phase)
                                 evaluate     │   • persiste cada uno al terminar
                                              │   • avanza current_phase_idx
                                              │   • re-enruta con el mismo router
                                 assemble ◀───┘
                                    │
                                    ▼
                                   END
```

**7 nodos**: `concierge`, `engage`, `explore`, `explain`, `elaborate`, `evaluate`, `assemble`.
**No hay nodo `validate`** ni bucle de reintento dentro del grafo: la validación/reparación y el
refine ocurren *dentro* de cada plan de generación, no como nodos.

### Router

`_route_next_phase(state)` (`graph.py:30`) es la única lógica de enrutado:

```python
phases = state.get("phase_order", [])
idx = state.get("current_phase_idx", 0)
return phases[idx] if idx < len(phases) else "assemble"
```

Es un puntero de avance, no una decisión inteligente. El `concierge` y cada nodo de fase usan
el **mismo** router: el concierge salta a la primera fase; cada fase incrementa
`current_phase_idx` y re-enruta a la siguiente (o a `assemble`).

### Una invocación de nodo = una fase completa

Cada nodo de fase genera **todos** los recursos de esa fase en una sola invocación
(`runtime.run_phase`), en paralelo acotado. (La versión anterior de este documento decía "un
recurso por invocación con bucle de validación" — eso ya no es cierto.)

---

## El plan: quién decide qué recursos generar

Hay **dos** orígenes de plan, y normalmente gana el cliente:

1. **Selección del cliente (camino normal)** — el front envía los recursos elegidos en
   `job.params["resources"]`. `jobs_runner._seed_plan` (`jobs_runner.py:51`) los convierte en
   `phases` + `phase_order` y los inyecta en el estado inicial. El concierge entonces **se
   salta** la planificación por LLM (`concierge_node` retorna temprano si el estado ya trae
   `phases` y `phase_order`).
2. **Planificación por LLM (modo legacy / sin selección)** — si no hay recursos sembrados, el
   `concierge` invoca el LLM tarea **`orquestador`** con el catálogo de 50 recursos y obtiene un
   JSON `{engage:[ids], explore:[...], ...}` con 2–4 IDs por fase. Si el LLM falla
   (rate-limit, JSON inválido) → `_FALLBACK_PLAN` determinista:

   | Fase | Recursos |
   |------|----------|
   | engage | 1, 5, 7, 10 |
   | explore | 1, 4, 7, 9 |
   | explain | 2, 3, 6, 8 |
   | elaborate | 1, 4, 7, 9 |
   | evaluate | 1, 4, 6, 8 |

Sembrar desde el cliente evita que el concierge re-planifique e ignore la selección (lo que
desalineaba las filas `OvaJobResource` y materializaba OVAs vacíos).

---

## `run_phase` — generación paralela acotada + persistencia en vivo

`backend/prometheus/runtime.py` — el corazón del rendimiento (Fase 2).

```
run_phase(state, phase, dispatch, meta):
  resources = state.phases[phase]
  workers   = min(OVA_GEN_CONCURRENCY=4, len(resources))
  _touch_job(job_id)                       # heartbeat al entrar a la fase
  ThreadPoolExecutor(workers):
    por cada recurso → dispatch(rt, concept, llm_config, enabled_models, theme, image_settings)
    al terminar cada uno:
      éxito → results += {...}; _persist_done(job_id, phase, rt, html)   # fila → "done"
      fallo → errors  += {...}                                            # lo resuelve el runner
  return { current_phase_idx+1, results, errors, progress+len(resources) }
```

Claves de diseño (y por qué):

- **Paralelismo acotado**: los recursos de una fase son independientes → se generan
  concurrentemente con un pool de `OVA_GEN_CONCURRENCY` (default 4) en vez de uno a uno.
- **Persistencia incremental** (`_persist_done`): cada recurso exitoso marca su fila
  `OvaJobResource` como `done` al instante → el polling muestra progreso real (no salta 0→100).
- **Heartbeat** (`_touch_job`): bombea `OvaJob.updated_at` al entrar a la fase y en cada
  persistencia, para que el *stale-sweep* (>180 s) no mate un job sano pero lento (el modelo de
  código tarda 2–3 min). El runner además lanza un hilo daemon que late cada `HEARTBEAT_S`.
- **Aislamiento de fallos**: la excepción de un recurso no tumba la fase; queda en `errors` y
  el runner decide reintento/error al final.

---

## Los 3 planes de generación

Cada nodo de fase elige plan por `resource_type` vía una tabla de despacho (`_dispatch`). Los
planes viven en `backend/prometheus/plans/` y son agnósticos de fase.

### `two_step_gen` — 2 pasos (texto → HTML)  ·  ~70% de los recursos
```
LLM "texto" (3000 tok) → JSON estructurado
   → [solo engage] enrich_with_images (placeholders __IMG_n__)
   → build_design_system(theme)                       # paleta UPAO o libre
   → LLM "codigo" (12000 tok) → strip_markdown → HTML
   → reemplazo de imágenes
   → validate_and_repair(html, phase, rt)             # determinista
   → maybe_refine(...)                                # crítico LLM opcional
```

### `direct_code_gen` — 1 paso (HTML directo)
Para recursos puramente visuales/interactivos (simuladores, diagramas, demos). Una sola llamada
LLM "codigo" → `validate_and_repair` → `maybe_refine`. Sin paso JSON intermedio.

### `podcast_gen` — monólogo → TTS → HTML
**Exclusivo** de ENGAGE recurso 3. LLM produce un monólogo en primera persona (el narrador *es*
el concepto) → Groq TTS → reproductor HTML5. No interviene un segundo LLM de código.

> El catálogo completo de los 50 recursos (IDs, duración, interactividad, plan por tipo) y las
> plantillas exactas de prompt están en [fases-5e.md](fases-5e.md).

---

## Validación y refine (no son nodos del grafo)

### `validate_and_repair` — determinista, dentro del plan
`backend/llm/html_validator.py`. Revisa estructura (`<!DOCTYPE>`, cierres `</html>`/`</script>`),
callbacks SCORM (`_scormInit`, `_scormComplete`, `cmi.core.lesson_status`), longitud mínima por
`(fase, tipo)` y ausencia de CDNs externos. Auto-repara cierres faltantes e inyecta SCORM antes
de `</body>`. **Nunca bloquea**: entrega el mejor HTML posible y registra las fallas restantes.

### `maybe_refine` — crítico LLM opcional, una sola corrección
`backend/prometheus/refine.py`. Solo actúa si `OVA_REFINE` está activo **y** hay defectos
reales (fallas estructurales que sobreviven a la auto-reparación, o "botones sin handlers JS").
Hace **una** llamada LLM dirigida a corregir esos defectos y **acepta el resultado solo si no
regresiona** (igual o menos fallas estructurales, y no es un stub truncado). El camino sano
(sin defectos) no paga ningún coste extra. No es un segundo pase secuencial sobre toda la OVA.

---

## Estado compartido (`OvaGenerationState`)

`state.py` — `TypedDict(total=False)`. Es la memoria compartida que cada nodo lee/escribe;
LangGraph fusiona los dicts parciales que retorna cada nodo.

| Campo | Tipo | Descripción |
|---|---|---|
| `prompt` | `str` | Concepto del usuario |
| `upload_ids` | `list[str]` | Archivos para RAG |
| `llm_config` | `dict` | Override de modelo por tarea |
| `enabled_models` | `list[dict]` | Modelos habilitados |
| `theme` | `dict` | `{color, design}` → paleta UPAO o libre |
| `image_settings` | `dict` | `{max_images, provider, api_key}` |
| `job_id` | `str` | Para persistencia incremental |
| `phases` | `dict` | `{phase: [{resource_type, resource_order}]}` |
| `phase_order` | `list[str]` | Fases activas en orden |
| `current_phase_idx` | `int` | Puntero de avance del router |
| `total_resources` / `progress` | `int` | Conteo planificado / procesado |
| `rag_context` | `str` | Contexto RAG |
| `results` | `Annotated[list[dict], operator.add]` | Resultados acumulados |
| `errors` | `Annotated[list[dict], operator.add]` | Errores acumulados |
| `scorm_zip_path` / `ova_status` | `str` | Salida de ensamblado |

> `results` y `errors` usan el *reducer* `operator.add` (concatena listas en cada retorno
> parcial). (La versión anterior decía `add_messages` — incorrecto.)

---

## Checkpointing

`backend/prometheus/checkpointer.py`. **El default es `MemorySaver` (en proceso), a propósito.**

- El progreso real ya está persistido a nivel `OvaJobResource` (`_persist_done`). La
  "reanudación" no lee checkpoints de LangGraph: el runner re-invoca el grafo y **salta las filas
  ya marcadas `done`** (`jobs_runner._persist_results`). El grafo nunca lee sus propios
  checkpoints → un saver durable no aporta nada.
- En el **Transaction pooler de Supabase** (pgbouncer) un saver durable es *dañino*: la evicción
  por inactividad cierra su conexión entre jobs, y un checkpoint persistido por `thread_id`
  cortocircuitaría el grafo en la reanudación (resultados vacíos → job marcado `error`).
- `PostgresSaver` queda disponible **opt-in** con `OVA_PG_CHECKPOINT=1` para despliegues en
  conexión *session-mode* donde se quieran checkpoints durables.

---

## Integración con el sistema de jobs

`backend/generation/jobs_runner.py` es el puente entre el modelo de jobs y el grafo:

```
1. POST /api/ova/jobs → crea OvaJob + filas OvaJobResource (status="pending")
2. el router lanza run_job(job_id) en un thread background
3. _load_for_run: sesión CORTA → marca "running" + snapshot de params, y CIERRA
   (no se sostiene una conexión durante los minutos del grafo; el pooler la evictaría)
4. _start_heartbeat: hilo daemon que late OvaJob.updated_at cada HEARTBEAT_S
5. _generate: _seed_plan(params.resources) → initial_state → invoke_ova_generation(...)
6. _finalize: sesión FRESCA → _persist_results → _finish_job (done|error por la BD) → _materialize
```

`any_done` se decide consultando la BD (no `len(results)`), de modo que también materializa lo
persistido en vivo aunque el grafo abortara a mitad (rate-limit, etc.).

> Para regenerar **un solo recurso** en modo edición existe un camino aparte,
> `backend/generation/regen_agents.py`, que no pasa por el grafo completo. Comparte el modelo
> `OvaJob` / `OvaJobResource`.

---

## Diseño de agentes — metodología Prometheus (AOSE)

**Prometheus** (Padgham & Winikoff, RMIT) es una metodología de *ingeniería de software orientada
a agentes* (AOSE) para **diseñar** sistemas multi-agente BDI. Es la metodología elegida (Sprint 2)
para el diseño de los agentes de GenOVA. Especifica el sistema en **3 fases**; abajo se mapea el
diseño real de GenOVA a esas fases.

> **Esto es diseño, no runtime.** Describe *cómo se especificaron* los agentes. La ejecución
> realiza este diseño como el pipeline orquestador-trabajadores de las secciones anteriores — no
> hay un intérprete BDI corriendo.

### Fase 1 — Especificación del sistema
| Concepto Prometheus | En GenOVA |
|---|---|
| **Metas** (goals) | Raíz: generar una OVA 5E completa desde un prompt. Submetas: un recurso pedagógicamente pertinente por `(fase, tipo)` |
| **Escenarios** | El usuario describe un concepto y elige recursos → el sistema genera y empaqueta una OVA SCORM |
| **Percepciones** (percepts) | `prompt`, contexto RAG (archivos subidos), `llm_config` / `enabled_models`, `theme` |
| **Acciones** | Llamadas LLM (`texto`/`codigo`/`orquestador`), TTS, generación de imágenes, validación/reparación HTML, ensamblado SCORM |

### Fase 2 — Diseño arquitectónico
| Concepto Prometheus | En GenOVA |
|---|---|
| **Tipos de agente** | Concierge (planificador) · 5 agentes de fase (Engage/Explore/Explain/Elaborate/Evaluate) · Ensamblador |
| **Diagrama de sistema** | Topología en estrella: concierge fija el plan, agentes de fase ejecutan, assemble cierra (ver [Arquitectura del grafo](#arquitectura-del-grafo)) |
| **Protocolo de interacción** | Comunicación **solo vía estado compartido** (no agente↔agente). El acoplamiento de datos es `OvaGenerationState` |

### Fase 3 — Diseño detallado (interno de cada agente)
| Concepto Prometheus | En GenOVA |
|---|---|
| **Capacidades** | `ResourceGeneration` (3 planes) · `ContextRetrieval` (RAG) · `HTMLValidation` · `Refinement` |
| **Planes** (plan library) | Cada agente de fase elige un plan de una biblioteca fija (`two_step` / `direct_code` / `podcast`) según el disparador `resource_type` (`_dispatch`) |
| **Creencias / datos** | `OvaGenerationState` (TypedDict compartido) |
| **Eventos** | `ResourceGenerated` / `PhaseComplete` / `GenerationFailed` — implícitos como transiciones de estado, no un bus de eventos explícito |

### Mapeo BDI — qué se realiza y con qué alcance

| Concepto BDI | Artefacto de diseño | Realización en runtime | Alcance honesto |
|---|---|---|---|
| **Beliefs** (creencias) | `OvaGenerationState` | Estado compartido tipado | Sí, pero **sin lógica de revisión** de creencias |
| **Desires** (deseos/metas) | Plan del concierge (recursos por fase) | `phases` + `phase_order` | Sí, pero plan **estático**, sin deliberación de deseos en conflicto |
| **Intentions** (intenciones/planes) | Biblioteca de 3 planes | `_dispatch` por `resource_type` | Sí — **selección real de plan por disparador** (el aspecto BDI mejor realizado) |

**Resumen defendible para el informe**: *se eligió Prometheus como metodología de diseño AOSE; el
sistema se especificó en sus 3 fases y se modeló con BDI; la implementación realiza ese diseño como
un pipeline orquestador-trabajadores en LangGraph, materializando Beliefs/Desires/Intentions de
forma acotada (sin revisión de creencias ni deliberación dinámica, innecesarias para una generación
de contenido determinista y paralelizable).*

---

## Núcleo real de la metodología

Despojado del envoltorio BDI, el patrón que corre es:

> **Orquestador–Trabajadores (orchestrator-workers) con plan estático, fan-out de un nivel y
> estado compartido tipado; auto-corrección acotada por subtarea.**

Sus cinco propiedades definitorias:

1. **Plan estático, una sola vez.** El `concierge` (o la selección del cliente) fija el plan al
   inicio. No hay *re-planning* ni deliberación durante la ejecución.
2. **Router determinista.** El avance entre fases es un índice, no una decisión de un agente.
3. **Fan-out de un nivel.** Cada "agente de fase" abre un lote paralelo de subtareas
   independientes (los recursos). No hay sub-agentes anidados ni delegación dinámica.
4. **Topología en estrella, sin diálogo agente↔agente.** Los nodos solo se comunican a través del
   estado compartido; nunca entre sí.
5. **Auto-corrección acotada, no autónoma.** Por recurso: validar/reparar (determinista) + un
   crítico LLM de **una** pasada. No hay bucle de razonamiento ni uso de herramientas en lazo.

### Comparación con otras metodologías multi-agente

| Metodología | Idea central | ¿Lo hace Prometheus? |
|---|---|---|
| **Orchestrator-Workers / Plan-Execute** (lo de aquí) | Un planificador fija subtareas; trabajadores las ejecutan en paralelo | **Sí** — es exactamente esto, con plan estático |
| **ReAct / agente con tool-loop** | El agente razona y llama herramientas en un bucle hasta cumplir la meta | No — sin bucle de razonamiento ni decisión de herramientas en runtime |
| **BDI** (*Belief-Desire-Intention*) | Creencias revisables, deseos en conflicto deliberados, intenciones de una biblioteca de planes | No — solo *inspiró* la nomenclatura; no hay revisión/deliberación. El plan es una tabla de despacho fija |
| **Blackboard** | Agentes oportunistas escriben en una pizarra común y reaccionan a su estado | Parcial — hay estado compartido, pero el orden es un router fijo, no reacción oportunista |
| **Supervisor jerárquico** (CrewAI / AutoGen) | Un supervisor delega y los agentes conversan multi-turno | No — sin conversación entre agentes ni delegación dinámica; topología fija |
| **Map-Reduce** | Mapear subtareas en paralelo, reducir resultados | Sí en espíritu: `run_phase` = map por fase; `assemble` = reduce |

**Mapeo BDI honesto** (analogía, no mecanismo): *Beliefs* ≈ el `state`; *Desires* ≈ el plan del
concierge (los "deseos" que el usuario leyó); *Intentions* ≈ `phase_order` ejecutándose. Útil
como modelo mental; no es un runtime BDI.

### Por qué LangGraph

LangGraph modela agentes como nodos de un grafo dirigido con **estado compartido tipado**,
enrutado condicional y checkpointing integrado — encaja con un pipeline determinista de
generación sin la sobrecarga de frameworks de conversación.

| Alternativa | Por qué no |
|---|---|
| **LangChain `AgentExecutor`** | Opaco; no expone el estado interno ni permite enrutado condicional fino |
| **CrewAI** | "Crew" con roles fijos y conversación; la topología no es controlable, y aquí no hace falta diálogo |
| **AutoGen** | Orientado a chat multi-turno entre agentes; no modela un pipeline determinista |

---

## Dependencias

```
langgraph
langgraph-checkpoint-postgres   # solo si OVA_PG_CHECKPOINT=1
```

Declaradas en `backend/pyproject.toml` / `requirements.txt`.

---

## Referencias

- [fases-5e.md](fases-5e.md) — Catálogo de los 50 recursos + plantillas de prompt por fase
- [catalogo-modelos.md](catalogo-modelos.md) — Modelos LLM, asignación por tarea y cadenas de fallback
- [workspace.md](workspace.md) — Workspace crear/editar OVA (consume los jobs)
- [api.md](api.md) — Endpoints REST del sistema de jobs
- `sdd/specs/EP-5_prometheus-langgraph.md`, `EN-003_jobs-background-generation.md`,
  `EN-013_resource-generation-with-retries.md` — Specs de origen
