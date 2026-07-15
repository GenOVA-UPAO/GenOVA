# Prometheus — motor de generación de OVAs

> Actualizado 2026-07-15 contra el código real; el motor por fases descrito en
> versiones anteriores de este documento fue eliminado el 2026-07-10.

**Prometheus** es el nombre interno del motor de generación de OVAs de GenOVA,
construido sobre **LangGraph**. Descompone el prompt del usuario en recursos
pedagógicos por fase 5E (Engage, Explore, Explain, Elaborate, Evaluate), los
genera con LLMs reales en paralelo y los ensambla en un paquete SCORM 1.2.

El motor único hoy es **work-pool**: un worker por recurso, sin barreras de
fase. El motor anterior (`concierge → engage → critic → explore → ... →
repair → editor → assemble`, con el critic corriendo una vez por cada una de
las 5 fases) se retiró tras el benchmark F2: **6:21 min para 20 recursos, 0
fallos**, frente a **~30 min** del motor por fases para la misma carga. La
razón del reemplazo es puramente de rendimiento: el motor por fases esperaba a
que terminara la fase más lenta antes de empezar la siguiente; el work-pool
lanza todos los recursos del plan en el mismo superstep de LangGraph, así que
el wall-clock se aproxima al del recurso individual más lento, no a la suma de
las 5 fases.

## Archivos clave

| Archivo | Rol |
|---|---|
| `backend/prometheus/engine/graph.py` | Punto de entrada: elige work-pool o el modo fake (`LLM_FAKE=1`) |
| `backend/prometheus/engine/workpool.py` | Construye el grafo real: `fan_out`, `resource_worker`, `collect_node` |
| `backend/prometheus/engine/state.py` | `OvaGenerationState` — TypedDict compartido entre nodos |
| `backend/prometheus/engine/bdi.py` | Ciclo BDI: `form_beliefs`, `generate_desires`, `deliberar`, `revise_beliefs` |
| `backend/prometheus/engine/runtime.py` | Heartbeat (`_touch_job`) y persistencia incremental (`_persist_done`) |
| `backend/prometheus/engine/validate.py` | Checklist estructural determinista + una ronda de feedback dirigido |
| `backend/prometheus/engine/checkpointer.py` | Checkpointer LangGraph (memoria por defecto) |
| `backend/prometheus/nodes/concierge.py` | BDI: percibe el prompt y arma el plan de recursos por fase |
| `backend/prometheus/nodes/critic.py` | Equipo editorial: crítica LLM + reintento con feedback (pass global) |
| `backend/prometheus/nodes/repair.py` | Reintento único de los recursos que fallaron en el fan-out |
| `backend/prometheus/nodes/editor.py` | Editor de coherencia 5E sobre el arco completo del OVA |
| `backend/prometheus/nodes/assemble.py` | Nodo terminal: prepara las fases para el ensamblado SCORM |
| `backend/prometheus/plans/plan_map.py` | Fuente única del plan de ejecución por recurso (`two_step` / `direct_code` / `podcast`) |
| `backend/prometheus/plans/two_step.py`, `direct_code.py`, `podcast.py` | Los tres planes de generación |
| `backend/prometheus/prompts/*_prompts.py` + `prompts/data/*.toml` | Catálogo de recursos y plantillas de prompt por fase |
| `backend/worker.py` | Entrypoint del worker `arq` (proceso separado del web) |
| `backend/generation/jobs/queue.py` | Encolado en `arq`/Redis (`enqueue_generation`) |
| `backend/generation/jobs/jobs_router.py`, `jobs_stream.py` | HTTP + SSE del sistema de jobs |

## Topología del grafo

```
START
  │
  ▼
concierge  (BDI: percibe, delibera, arma intentions)
  │
  │  fan_out(state) → un Send("resource_worker", …) por recurso del plan
  ▼
resource_worker × N   (uno por recurso, en paralelo, sin esperar a los demás)
  │
  ▼
collect            (join del fan-out; agrega worker_signals a beliefs)
  │
  ▼
critic              (pass global único sobre todos los recursos)
  │
  ▼
repair               (un reintento para los recursos que fallaron)
  │
  ▼
editor               (revisión de coherencia 5E del arco completo, opcional)
  │
  ▼
assemble
  │
  ▼
END
```

Diferencias clave frente al motor por fases eliminado:

- **Sin barreras de fase**: los N recursos de las 5 fases corren en el mismo
  superstep de LangGraph. La concurrencia real la limita `max_concurrency`
  del `invoke` (`settings.ova_gen_concurrency`, ver más abajo), no un
  `ThreadPoolExecutor` por fase.
- **Un solo pase del critic**: antes corría una vez por cada una de las 5
  fases; ahora corre una vez sobre el conjunto completo de recursos y sigue
  siendo quien commitea a `results`.
- **`repair` y `editor` se reutilizan tal cual** del motor anterior.

## Ciclo de vida de un job

1. `POST /api/ova/jobs` crea el `OvaJob` + sus filas `OvaJobResource`
   (`status="pending"`) y responde `202 { job_id, status: "queued" }`.
2. `jobs_router_helpers._launch` decide cómo ejecutar la generación:
   - Si `REDIS_URL` está configurado, encola la tarea `run_generation` en
     `arq` (`generation/jobs/queue.py:enqueue_generation`) para que la
     procese el **worker separado** (`backend/worker.py`, proceso `arq
     worker.WorkerSettings`).
   - Si no hay `REDIS_URL`, o si el encolado falla, corre inline en un hilo
     daemon (`threading.Thread(target=run_job, daemon=True)`) — así el
     desarrollo local funciona sin worker.
3. El runner (`generation/jobs/jobs_runner.py`) siembra el estado inicial,
   invoca `invoke_ova_generation` (el grafo work-pool) y persiste los
   resultados.
4. Cada `resource_worker` marca su fila `OvaJobResource` como `done` al
   instante (`_persist_done`), así que el progreso se ve en tiempo real y no
   salta de 0% a 100% al final.
5. El frontend sigue el progreso vía **SSE** — `GET
   /api/ova/jobs/{job_id}/stream` (`generation/jobs/jobs_stream.py`) — que
   emite un evento `progress` cada vez que cambia el snapshot del job y un
   evento final `done` al llegar a un estado terminal (`done`/`error`/
   `canceled`). Hay un `GET /api/ova/jobs/{job_id}` de respaldo para polling.
6. Si el proceso del worker muere a mitad de una generación, `resume_orphans`
   (arrancado con el worker) reencola los jobs `running` huérfanos cuyo
   `updated_at` quedó viejo, regenerando solo los recursos que no llegaron a
   persistirse como `done`.

## BDI y viabilidad

El ciclo BDI (Rao & Georgeff / Padgham & Winikoff) corre íntegro en cada
invocación, en `backend/prometheus/engine/bdi.py`:

| Paso | Función | Qué hace |
|---|---|---|
| Beliefs | `form_beliefs` | Score de calidad RAG, complejidad del tema y capacidad de los modelos habilitados, a partir del prompt y los archivos subidos |
| Desires | `generate_desires` | Enumera todos los recursos candidatos del plan (uno por `(fase, resource_type)`) |
| Deliberación | `deliberar` | Filtro que calcula una **viabilidad** 0.5–1.0 por deseo y lo compromete como intención con su `plan_type` |
| Belief revision | `revise_beliefs` | Tras el join del fan-out, actualiza creencias con la tasa de éxito real (`last_phase_quality`) |

La viabilidad aplica descuentos — no rechazos — según el tipo de recurso:

- Recursos **complejos** (tipos 4, 7, 9, 10 — simuladores, laboratorios de
  código) con modelos de baja capacidad: descuento del 20%.
- Recursos **dependientes de contexto** (tipos 2, 3, 5, 6, 8) con poco RAG
  disponible: descuento del 15%.
- **Piso de 0.5**: todo recurso elegido por el cliente siempre se compromete
  como intención. El agente puede penalizar la confianza en un recurso, pero
  nunca lo descarta — la selección del usuario tiene prioridad de negocio
  sobre la deliberación BDI.

Cada `resource_worker` despacha por el `plan_type` de su intención
(`two_step`, `direct_code` o `podcast` — ver `plans/plan_map.py`), y si falla
emite una señal en `worker_signals` que `collect` agrega a `beliefs`
(`failed_resources`, `failures_by_error`, `accumulated_errors`). La
recuperación de fallos ocurre en dos capas independientes de la deliberación
inicial:

- **`validate_and_improve`** (`engine/validate.py`), dentro de cada worker:
  un checklist determinista (falta `_scormComplete()`, sin elementos
  interactivos, placeholders, contenido demasiado corto) dispara hasta 2
  rondas de feedback dirigido al mismo recurso antes de darlo por terminado.
- **`repair_node`**, después del join de todos los recursos: reintenta una
  vez cada recurso que quedó en `errors`, degradando el plan de `two_step` a
  `direct_code` cuando existe plantilla de código directo (menos llamadas
  LLM, menos superficie de fallo). Si el reintento también falla, el recurso
  se marca `exhausted` y la reconciliación final lo cierra como `error` en
  vez de dejarlo `pending` para siempre.

Ningún recurso se descarta del plan por baja viabilidad: en el peor caso
queda documentado como fallido tras agotar `validate` y `repair`.

## Equipo editorial (critic / repair / editor)

Tres pasadas de calidad se ejecutan después del fan-out, en orden:

1. **`critic_node`** (`nodes/critic.py`) — activable con `ova_critic` (env o
   panel admin). Evalúa cada recurso con un crítico LLM
   (`critique_resource`) y, si el veredicto es "revisar", aplica hasta
   `ova_reflection_rounds` (default 1) rondas de `apply_feedback` antes de
   quedarse con la mejor versión vista. Corre en paralelo por recurso
   (`ThreadPoolExecutor`). Cuando está deshabilitado, es un pase gratuito que
   solo commitea `current_phase_results` a `results`.
2. **`repair_node`** (`nodes/repair.py`) — descrito arriba; reintenta los
   fallos que sobrevivieron al fan-out.
3. **`editor_node`** (`nodes/editor.py`) — activable con `ova_editor`. Revisa
   el arco completo del OVA (los 5 recursos en orden de fase) buscando
   inconsistencias de terminología o saltos de progresión cognitiva entre
   fases, y aplica parches de texto mínimos (`buscar`/`reemplazar`) con
   protección anti-regresión: descarta un parche si el HTML resultante
   encoge por debajo del 80% del original. Es *best-effort*: cualquier fallo
   deja `coherence_report={}` sin bloquear el ensamblado.

## Los 3 planes de generación

`backend/prometheus/plans/plan_map.py` es la fuente única de qué plan
ejecuta cada `(fase, resource_type)`:

| Plan | Cuándo | Qué hace |
|---|---|---|
| `direct_code` | Recursos con plantilla de código directo (`CODE_ONLY` por fase) | Una sola llamada LLM "código" → HTML. Sin paso de texto intermedio |
| `podcast` | Único caso: `(engage, resource_type=3)` | LLM produce un monólogo en primera persona → TTS → reproductor HTML5 |
| `two_step` | Todo lo demás (~70% de los recursos) | LLM "texto" (estructura) → LLM "código" (HTML) |

## Variables de entorno relevantes

| Variable | Rol |
|---|---|
| `LLM_FAKE` | Si es verdadero, `graph.invoke_ova_generation` usa `fake_invoke_ova_generation` (sin llamadas LLM reales) — para tests y desarrollo sin cuota |
| `REDIS_URL` | Si está seteada, los jobs se encolan en `arq` para el worker separado; si no, corren inline en un hilo daemon del proceso web |
| `OVA_GEN_CONCURRENCY` | `max_concurrency` del `invoke` de LangGraph — cuántos `resource_worker` corren a la vez (default 8) |
| `ARQ_MAX_JOBS` | Jobs concurrentes que procesa el worker `arq` |
| `OVA_CRITIC` | Activa el pase del crítico LLM (`nodes/critic.py`) |
| `OVA_REFLECTION_ROUNDS` | Rondas máximas de feedback dirigido del crítico por recurso |
| `OVA_EDITOR` | Activa el editor de coherencia 5E (`nodes/editor.py`) |

## Checkpointing

`backend/prometheus/engine/checkpointer.py` — el default es `MemorySaver` (en
proceso), a propósito. El progreso real ya está persistido a nivel de fila
`OvaJobResource` (`_persist_done`); la reanudación no depende de checkpoints
de LangGraph: el runner vuelve a invocar el grafo y las filas ya marcadas
`done` se saltan en la reconciliación final. Un saver durable en el
Transaction pooler de Supabase sería, además, contraproducente: la evicción
por inactividad de pgbouncer cortaría su conexión entre jobs.

## Ver también

- [workspace.md](workspace.md) — workspace de creación/edición que consume estos jobs
- [fases-5e.md](fases-5e.md) — catálogo de los 50 recursos y plantillas de prompt por fase
- [generacion-5e.md](generacion-5e.md) — pipeline de generación y cadena de fallback LLM
- [api.md](api.md) — referencia REST del sistema de jobs
