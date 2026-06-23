# Prometheus — Motor multi-agente de generación de OVAs

> **Prometheus** es el nombre interno del motor de generación de OVAs de GenOVA, construido
> sobre **LangGraph**. Descompone el prompt del usuario en recursos por fase 5E, los genera
> con LLMs reales en paralelo y los ensambla en un paquete SCORM 1.2.
>
> **Diseño y runtime BDI**: la metodología **Prometheus (AOSE)** de Padgham & Winikoff
> formaliza los agentes en 3 fases y modela el comportamiento con la triada
> **BDI** (*Belief-Desire-Intention*). El runtime **implementa el ciclo BDI completo**:
>
> | Componente BDI | Módulo | Descripción |
> |---|---|---|
> | `form_beliefs` | `prometheus/engine/bdi.py` | Forma creencias desde RAG, prompt y modelos |
> | `generate_desires` | `prometheus/engine/bdi.py` | Genera deseos (recursos candidatos) |
> | `deliberar` (liberador BDI) | `prometheus/engine/bdi.py` | Filtro deliberativo: convierte deseos en intenciones |
> | `revise_beliefs` | `prometheus/engine/bdi.py` | Revisión de creencias tras cada fase |
> | `OvaGenerationState.beliefs/desires/intentions` | `prometheus/engine/state.py` | Estado BDI tipado en el grafo |
>
> El ciclo corre en cada invocación: el `concierge_node` percibe, forma creencias, genera deseos,
> delibera y compromete intenciones. El `runtime.run_phase` revisa creencias tras cada fase.

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

### Mapeo BDI — ciclo completo implementado

| Concepto BDI | Función | Módulo | Descripción |
|---|---|---|---|
| **Beliefs** (creencias) | `form_beliefs()` | `engine/bdi.py` | RAG quality, topic complexity, model capability |
| **Desires** (deseos) | `generate_desires()` | `engine/bdi.py` | Todos los recursos candidatos del plan |
| **Deliberación** (liberador BDI) | `deliberar()` | `engine/bdi.py` | Filtro que compromete deseos como intenciones |
| **Intentions** (intenciones) | campo `intentions` en estado | `engine/state.py` | Lista tipada con plan_type y viabilidad por intención |
| **Belief revision** | `revise_beliefs()` | `engine/bdi.py` | Actualiza creencias con calidad real de cada fase |
| **Plan selection** | `_dispatch` por `resource_type` | nodos de fase | Biblioteca de 3 planes: `two_step`, `lab_codigo`, `podcast` |

**Ciclo por invocación**:
1. `concierge_node` percibe (prompt, RAG, modelos) → `form_beliefs`
2. LLM propone recursos → `generate_desires`
3. **Liberador BDI**: `deliberar(desires, beliefs)` → `intentions` comprometidas con viabilidad y plan_type
4. Intenciones → `phases` + `phase_order` (plan de ejecución)
5. Tras cada fase: `revise_beliefs(beliefs, phase, results, errors)` → creencias actualizadas

**Para el informe**: *La metodología Prometheus (Padgham & Winikoff) se implementa con el ciclo BDI
completo de Rao & Georgeff: beliefs formados desde percepción, desires generados desde el catálogo de
recursos, un liberador BDI (función `deliberar`) que filtra y compromete intenciones, y revisión de
creencias posterior a cada fase.*

---

## El liberador BDI — `deliberar` en detalle

Esta sección describe con precisión técnica el ciclo BDI implementado en `backend/prometheus/engine/bdi.py`.
El ciclo se ejecuta en cada invocación del `concierge_node` y sigue el modelo Rao & Georgeff / Padgham & Winikoff.

### 1. Rol del liberador BDI en el ciclo

En la arquitectura BDI canónica el *liberador* (también llamado *filtro deliberativo*) es la función
que transforma el conjunto de deseos activos en intenciones comprometidas. No todos los deseos se
convierten en intenciones: el liberador evalúa su viabilidad frente a las creencias del agente y
decide cuáles vale la pena ejecutar y en qué orden.

En GenOVA ese rol lo cumple `deliberar(desires, beliefs)` en `bdi.py`. Su salida — la lista de
intenciones — es la que el `concierge_node` convierte en `phases` + `phase_order`, el plan real de
ejecución del grafo.

### 2. Formación de creencias — `form_beliefs`

Las creencias representan lo que el agente sabe del entorno de generación *antes* de planificar.
`form_beliefs` produce un diccionario tipado con tres scores continuos y campos de seguimiento:

| Campo | Rango | Fórmula / lógica |
|---|---|---|
| `rag_quality` | 0–1 | Con texto RAG: `min(1.0, log1p(len) / log1p(5000))`; solo upload_ids sin texto: 0.7; sin nada: 0.0 |
| `topic_complexity` | 0–1 | `min(1.0, palabras_en_prompt / 80)` — satura en prompts de 80 o más palabras |
| `model_capability` | 0.6 / 1.0 | 1.0 si algún modelo habilitado contiene keyword premium (`70b`, `large`, `deepseek`, `gemini`, `claude`, `gpt-4`, `mixtral-8x22`); 0.6 en caso contrario |
| `has_uploads` | bool | Verdadero si hay al menos un `upload_id` |
| `completed_phases` | list | Inicialmente vacío; crece con `revise_beliefs` tras cada fase |
| `accumulated_errors` | int | Contador de errores acumulados entre fases |
| `last_phase_quality` | float \| None | Calidad de la última fase ejecutada; None al inicio |

**Nota sobre `rag_quality`**: usa `log1p` para comprimir el rango de tamaño del contexto RAG
(que puede variar de decenas a miles de caracteres) en una escala 0–1. Un contexto de 5000
caracteres equivale aproximadamente a 1.0. La constante 5000 fue elegida como referencia de
contexto "completo" (varios chunks RAG concatenados).

**Nota sobre `model_capability`**: el valor 0.6 (no 0.5) para modelos base refleja que incluso
un modelo de capacidad estándar puede generar el recurso — solo con menor confianza que un modelo
premium.

### 3. Generación de deseos — `generate_desires`

Los deseos representan *todo lo que el agente quiere producir*, sin filtro de viabilidad todavía.
`generate_desires` itera el plan de recursos (dict `{fase: [{resource_type, resource_order}]}`) y
produce una lista plana de deseos, cada uno con `priority = 1.0`:

```
desires = [
  {phase: "engage",   resource_type: 1, resource_order: 0, priority: 1.0},
  {phase: "engage",   resource_type: 3, resource_order: 1, priority: 1.0},
  {phase: "explore",  resource_type: 4, resource_order: 0, priority: 1.0},
  ...
]
```

La prioridad uniforme de 1.0 indica que, en esta versión, todos los recursos elegidos por el
cliente tienen la misma importancia declarada. La diferenciación se produce en el paso siguiente,
cuando `deliberar` calcula la viabilidad de cada uno.

### 4. El algoritmo de viabilidad — `_score_viability`

Es el corazón del liberador. Para cada deseo computa un score de viabilidad en [0.5, 1.0]:

```
viability = 1.0

si resource_type ∈ {4, 7, 9, 10}  (tipos complejos)
   y model_capability < 0.6:
    viability *= 0.8               # descuento del 20 %

si resource_type ∈ {2, 3, 5, 6, 8}  (tipos context-heavy)
   y rag_quality < 0.2:
    viability *= 0.85              # descuento del 15 %

viability = max(0.5, viability)    # piso garantizado
```

**Tipos complejos** (`_COMPLEX_TYPES = {4, 7, 9, 10}`): recursos interactivos de alta carga
computacional — simuladores, laboratorios de código, demos avanzadas. Con un modelo base
(`model_capability = 0.6`) el agente cree que la generación será menos fiable, y reduce la
viabilidad a 0.80.

**Tipos context-heavy** (`_CONTEXT_HEAVY = {2, 3, 5, 6, 8}`): recursos pedagógicos que mejoran
sensiblemente con contexto externo — artículos explicativos, podcasts, infografías, timelines,
mapas conceptuales. Sin RAG (`rag_quality < 0.2`) el agente descuenta la viabilidad a 0.85.

**Piso de 0.5**: garantiza que *todo recurso seleccionado por el cliente siempre se compromete
como intención*. No existe filtro de rechazo: `viability > 0` es siempre verdadero (mínimo 0.5).
El piso modela la política de negocio de que el usuario tiene autoridad sobre qué recursos generar;
el agente puede penalizar la confianza pero no puede cancelar la intención.

Los dos descuentos son independientes y acumulables: un recurso de tipo 4 (complejo) sin modelo
premium *y* sin RAG sufriría `1.0 × 0.8 × 0.85 = 0.68`, que con el piso queda en `0.68` (por
encima de 0.5, así que el piso no interviene).

### 5. Selección de plan — `_select_plan_type`

Una vez que un deseo se compromete como intención, recibe un `plan_type` que determina cuál de
los tres planes de generación ejecutará `run_phase`:

| Condición | `plan_type` | Plan |
|---|---|---|
| `resource_type == 3` (podcast ENGAGE) | `"podcast"` | Monólogo → TTS → HTML |
| `phase == "elaborate"` y `resource_type == 7` | `"lab_codigo"` | Laboratorio de código interactivo |
| Cualquier otro caso (~70 % de recursos) | `"two_step"` | Texto estructurado → HTML |

La asignación es determinista y basada en identidad del recurso, no en las creencias. El `plan_type`
queda registrado en cada intención de `OvaGenerationState.intentions` para trazabilidad.

### 6. Ordenamiento de intenciones

Tras calcular viabilidad y plan_type para todos los deseos, `deliberar` ordena la lista de
intenciones en orden descendente por `priority × viability`:

```python
intentions.sort(key=lambda i: i["priority"] * i["viability"], reverse=True)
```

Con `priority = 1.0` uniforme, el orden queda determinado exclusivamente por `viability`. Los
recursos de mayor viabilidad (mayor confianza del agente) se ejecutan primero dentro de una misma
fase. En la práctica, los recursos más simples (tipos no complejos, sin necesidad de RAG) tienen
viabilidad 1.0 y encabezan la lista; los degradados quedan al final pero igualmente comprometidos.

### 7. Revisión de creencias — `revise_beliefs`

Tras completar cada fase, el `runtime.run_phase` invoca `revise_beliefs` para que el agente
actualice su modelo del entorno con evidencia real:

```
last_phase_quality = len(results) / max(1, len(results) + len(errors))
```

El campo `last_phase_quality` captura la tasa de éxito de la fase recién ejecutada (0.0 = todo
falló, 1.0 = todo exitoso). Los campos `completed_phases` y `accumulated_errors` crecen con cada
fase. Estas creencias actualizadas estarían disponibles para un ciclo BDI en una fase posterior —
aunque en la implementación actual el liberador solo corre una vez (en el `concierge`), la
estructura permite deliberación adaptativa si se extiende el sistema.

### 8. Ejemplo de ciclo completo

El siguiente ejemplo ilustra cómo fluye un request real con contexto RAG medio y modelos premium:

```
Entrada:
  prompt       = "Redes neuronales convolucionales para clasificación de imágenes"
                 (8 palabras)
  rag_context  = "... 1200 caracteres de contexto RAG ..."
  enabled_models = [{"id": "deepseek-v3"}, {"id": "llama-3.1-8b"}]
  upload_ids   = ["doc-abc123"]
  resources    = [{phase:engage, rt:1}, {phase:engage, rt:3}, {phase:explore, rt:7}]

form_beliefs:
  rag_quality      = min(1.0, log1p(1200) / log1p(5000)) ≈ 0.837
  topic_complexity = min(1.0, 8/80) = 0.100
  model_capability = 1.0  (deepseek → keyword "deepseek" detectado)
  has_uploads      = True

generate_desires:
  D1 = {phase:engage,  rt:1, order:0, priority:1.0}
  D2 = {phase:engage,  rt:3, order:1, priority:1.0}
  D3 = {phase:explore, rt:7, order:0, priority:1.0}

_score_viability:
  D1 (rt=1): ni complejo ni context-heavy → viability = 1.0
  D2 (rt=3): context-heavy, rag=0.837 ≥ 0.2 → sin descuento → viability = 1.0
  D3 (rt=7): complejo, cap=1.0 ≥ 0.6 → sin descuento → viability = 1.0

deliberar → intenciones (ordenadas por priority × viability):
  I1 = {phase:engage,  rt:1, plan_type:"two_step", viability:1.0, committed:True}
  I2 = {phase:engage,  rt:3, plan_type:"podcast",  viability:1.0, committed:True}
  I3 = {phase:explore, rt:7, plan_type:"two_step", viability:1.0, committed:True}

Ejecución engage (results=2, errors=0):
  revise_beliefs → last_phase_quality=1.0, completed_phases=["engage"], accumulated_errors=0

Ejecución explore (results=0, errors=1):
  revise_beliefs → last_phase_quality=0.0, completed_phases=["engage","explore"], accumulated_errors=1
```

En el escenario de fallo de explore, las creencias reflejan la dificultad del recurso complejo
(rt=7 falló), pero el ciclo ya está comprometido — no hay re-deliberación dentro del mismo job.
La política de reintentos la maneja `jobs_runner` a nivel de `OvaJobResource`, fuera del ciclo BDI.

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
| **BDI** (*Belief-Desire-Intention*) | Creencias revisables, deseos deliberados, intenciones de una biblioteca de planes | **Sí** — `bdi.py` implementa `form_beliefs`, `deliberar` (liberador BDI) y `revise_beliefs` con lógica real |
| **Blackboard** | Agentes oportunistas escriben en una pizarra común y reaccionan a su estado | Parcial — hay estado compartido, pero el orden es un router fijo, no reacción oportunista |
| **Supervisor jerárquico** (CrewAI / AutoGen) | Un supervisor delega y los agentes conversan multi-turno | No — sin conversación entre agentes ni delegación dinámica; topología fija |
| **Map-Reduce** | Mapear subtareas en paralelo, reducir resultados | Sí en espíritu: `run_phase` = map por fase; `assemble` = reduce |

**BDI en runtime** (`prometheus/engine/bdi.py`): *Beliefs* = dict tipado con `rag_quality`,
`topic_complexity`, `model_capability`, actualizado por `revise_beliefs` tras cada fase;
*Desires* = lista de recursos candidatos; *Intentions* = lista comprometida tras `deliberar`
(el liberador BDI), cada una con `plan_type` y `viability`.

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
