# Metodología de diseño de agentes — GAIA (propuesta)

> **Propuesta**: adoptar **GAIA** como metodología AOSE de diseño de los agentes, en lugar de
> Prometheus. Este documento es independiente de [prometheus.md](prometheus.md) (que describe el
> motor actual); aquí se plantea el cambio y se justifica.
>
> El entregable admite **ambos** enfoques, así que se cubren las dos capas:
> 1. **Diseño (AOSE académica)** → **GAIA** (roles, interacciones, organización).
> 2. **Runtime (patrón de ingeniería moderno)** → **orchestrator-workers** (+ prompt-chaining + routing).
>
> Las dos capas describen *la misma realidad sin BDI*, así que no hay brecha que defender.

---

## Por qué GAIA en lugar de Prometheus

| | Prometheus (actual) | GAIA (propuesta) |
|---|---|---|
| Paradigma | AOSE **BDI** (Belief-Desire-Intention) | AOSE de **roles/organización**, agnóstica de los internos del agente |
| Encaje con el sistema | Asume agentes con creencias revisables, deseos deliberados, intenciones de una biblioteca de planes — **el runtime no tiene nada de eso** | Modela roles, responsabilidades, protocolos y organización — **exactamente lo que sí tienes** |
| Honestidad | Hay que defender "BDI a nivel de diseño, realizado de forma acotada" (brecha diseño↔runtime) | Diseño y runtime describen lo mismo; **sin brecha** |
| Coste de adopción | Para ser honesto end-to-end habría que implementar BDI (creencias/deliberación) | **Cero código**: solo cambia la documentación de diseño |

Tus agentes son *LLM-callers sin estado*: reciben una tarea, llaman un LLM, devuelven HTML. No
deliberan ni revisan creencias. GAIA modela precisamente sistemas así —una **organización de roles
que interactúan**— sin forzar mecanismos cognitivos inexistentes. Por eso es el calce honesto.

---

## Capa 1 — Diseño con GAIA (AOSE)

GAIA (Wooldridge, Jennings & Kinny; extensión organizacional de Zambonelli) especifica el sistema
en dos fases: **análisis** (qué roles e interacciones hay) y **diseño** (cómo se realizan en
agentes y servicios).

### Fase de análisis

#### Modelo de roles

| Rol | Responsabilidades (liveness · safety) | Permisos | Actividades |
|---|---|---|---|
| **Planner** (Concierge) | Derivar el plan de recursos por fase desde el prompt · nunca producir un plan vacío (fallback) | Lee `prompt`, RAG, `llm_config` | `DescomponerPrompt`, `PlanFallback` |
| **ResourceGenerator** (paramétrico, una instancia por `(fase, tipo)`) | Generar un recurso HTML válido para su `(fase, tipo)` · el fallo de un recurso no detiene a los demás | Lee item del plan, `concept`, RAG, `llm_config`; escribe su fila `OvaJobResource` | `SeleccionarPlan`, `GenerarTexto`, `GenerarCódigo`, `ValidarReparar`, `Refinar` |
| **Assembler** | Recolectar resultados, ordenarlos, marcar estado, materializar OVA/SCORM · solo ensambla si hay ≥1 recurso `done` | Lee `results`; escribe `Ova`/SCORM | `Ensamblar`, `Materializar` |
| **Orchestrator** (control) | Sostener el job: heartbeat, persistencia, finalización · marcar `error` si nada se generó | Lee/escribe `OvaJob` | `Latido`, `PersistirIncremental`, `Finalizar` |

#### Modelo de interacciones (protocolos)

Topología en **estrella**, mediada por el estado compartido (no hay diálogo Generator↔Generator):

| Protocolo | De → A | Contenido |
|---|---|---|
| `AsignarRecursos` | Planner → ResourceGenerators | `phases` + `phase_order` (qué generar) |
| `EntregarResultado` | ResourceGenerator → Assembler | `{phase, html, resource_type, title}` o `error` |
| `Control` | Orchestrator ↔ todos | heartbeat, persistencia, estado del job |

### Fase de diseño

#### Modelo de agentes
Un tipo de agente por rol (realizados como nodos LangGraph): `Planner→concierge`,
`ResourceGenerator→nodos de fase` (engage…evaluate, que instancian el rol N veces en paralelo),
`Assembler→assemble`, `Orchestrator→generation/jobs_runner.py`.

#### Modelo de servicios
Servicios derivados de las actividades. Ejemplo del más importante:

| Servicio | Entrada | Salida | Pre / Post |
|---|---|---|---|
| `generarRecurso` | `(phase, type, concept, ctx)` | `html` \| `error` | Pre: existe item del plan · Post: fila `OvaJobResource` en `done`/`error` |
| `descomponerPrompt` | `prompt` | `phases`, `phase_order` | Post: plan no vacío (fallback garantiza) |
| `ensamblar` | `results` | OVA + SCORM | Pre: ≥1 `done` |

#### Modelo de conocidos (acquaintance)
`Planner → ResourceGenerator → Assembler`; `Orchestrator ↔ {todos}`. Sin aristas
Generator↔Generator (acoplamiento mínimo).

#### Estructura organizacional + reglas
- **Estructura**: jerárquica con régimen de **orquestación** (un router determinista dirige el
  control; los roles no se auto-organizan).
- **Reglas organizacionales** (invariantes del sistema):
  1. La **selección del cliente** prevalece sobre el plan del Planner.
  2. Un recurso se persiste **solo** cuando su generación tiene éxito (`done`).
  3. La generación **nunca** se bloquea por el fallo de un recurso individual.
  4. El Assembler **requiere ≥1** recurso `done`; si no, el job es `error`.

---

## Capa 2 — Runtime: patrón orchestrator-workers

El diseño GAIA se **implementa** con patrones de orquestación de LLM (taxonomía tipo Anthropic
*"Building Effective Agents"*), no con un runtime de agentes autónomos:

- **Orchestrator-workers**: el Planner (orquestador) fija subtareas; los ResourceGenerators
  (workers) las ejecutan. ↔ rol Planner + rol ResourceGenerator de GAIA.
- **Routing**: el `_dispatch` por `resource_type` elige el plan de generación. ↔ actividad
  `SeleccionarPlan`.
- **Prompt-chaining**: `two_step` (texto → JSON → HTML) encadena dos llamadas. ↔ actividades
  `GenerarTexto` + `GenerarCódigo`.

Detalle del runtime real (grafo, paralelismo, persistencia) en [prometheus.md](prometheus.md) — el
nombre del paquete se mantiene como *codename*; la **metodología** pasa a ser GAIA.

---

## ¿Hay una manera mejor que solo orchestrator-workers?

Orchestrator-workers es la **familia correcta** para este problema (catálogo fijo, subtareas
independientes, determinista). No conviene cambiar de paradigma. Pero **dentro** de esa familia hay
mejoras concretas:

### 1. Más rápido: aplanar a **Map-Reduce** (quitar la barrera por fase)
Hoy las 5 fases corren **en serie** (engage termina → explore empieza), con paralelismo solo
*dentro* de cada fase. Pero los recursos son independientes **también entre fases** — el orden 5E
solo importa para el OVA final, que el Assembler ordena de todos modos.

- **Propuesta**: un único *map* paralelo acotado sobre **todos** los recursos seleccionados →
  *reduce* en `assemble` (que ordena por `(phase, order)`).
- **Efecto**: el tiempo de pared pasa de *suma de los recursos más lentos de cada fase* a *el
  recurso más lento global* (acotado por el pool). Mismo pico de concurrencia (`OVA_GEN_CONCURRENCY`).
- **Bonus**: el grafo se reduce de 7 nodos a **3** (`concierge → generate → assemble`), más simple
  de testear y razonar.
- **Riesgo**: ninguno funcional; la persistencia incremental y el heartbeat se mantienen por recurso.

### 2. Más efectivo (calidad): **evaluator-optimizer** explícito
Tu `maybe_refine` ya es la semilla de este patrón (genera → evalúa → corrige). Convertirlo en una
etapa de calidad nombrada (con criterios explícitos y, opcional, 1 chequeo de coherencia del OVA
completo en `assemble`) sube la calidad sin reintroducir loops por recurso.

### Recomendación
- **Adoptar (1)** map-reduce plano → gana velocidad y simplicidad, sin cambiar el paradigma ni la
  resiliencia. Encaja igual con el diseño GAIA (los roles no cambian; cambia el régimen de control
  de "secuencial por fase" a "paralelo global").
- **Mantener (2)** evaluator-optimizer como la palanca de calidad.
- **No** ir a ReAct / BDI / jerárquico-conversacional: añaden autonomía/latencia que este problema
  determinista no necesita.

---

## Resumen para la sustentación

> *Para el diseño de los agentes se eligió **GAIA**, metodología AOSE centrada en roles,
> interacciones y organización, por ser el calce honesto con un sistema cuyos agentes son ejecutores
> sin estado (no BDI). El sistema se especificó con los modelos de roles, interacciones, agentes,
> servicios, conocidos y reglas organizacionales de GAIA. En la capa de implementación, ese diseño
> se realiza con el patrón **orchestrator-workers** (+ routing + prompt-chaining), con una evolución
> propuesta a **map-reduce plano** para eliminar las barreras por fase y ganar tiempo de pared.*

---

## Referencias

- [prometheus.md](prometheus.md) — Motor de runtime (grafo LangGraph, planes, persistencia)
- [fases-5e.md](fases-5e.md) — Catálogo de los 50 recursos + plantillas de prompt
- Wooldridge, Jennings & Kinny (2000), *The Gaia Methodology for AOSE*; Zambonelli, Jennings &
  Wooldridge (2003), extensión organizacional.
- Anthropic, *Building Effective Agents* — taxonomía de patrones (orchestrator-workers, routing,
  prompt-chaining, evaluator-optimizer).
