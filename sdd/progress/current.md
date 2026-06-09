# Sesión actual

> Este archivo se vacía al cerrar cada sesión y su contenido se mueve a `history.md`.

## 2026-06-07 — Unificar crear+editar OVA en un solo workspace + arreglar generación/SCORM

**Estado:** completo. Pendiente: commit (2) + cierre.

---

## 2026-06-08 — Catálogo unificado de modelos (HU-034)

**Estado:** completo. Commit: `f143a76`.

---

## 2026-06-08 — Arquitectura Multi-Agente Prometheus con LangGraph (EN-003 / EP-5)

**Agente:** opencode (inline)
**Alcance:** implementar la arquitectura multi-agente Prometheus sobre LangGraph, refactorizar ENGAGE/EXPLORE, agregar las 3 fases 5E faltantes (EXPLAIN, ELABORATE, EVALUATE) con sus 10 recursos cada una.

### Nuevo paquete: `backend/prometheus/` (14 archivos)
- `state.py`: `OvaGenerationState` (TypedDict compartido)
- `graph.py`: `StateGraph` con 8 nodos + conditional edges (concierge → fases → validate → next/retry → assemble)
- `checkpointer.py`: `PostgresSaver` con fallback `MemorySaver`
- `nodes/`: 8 nodos — `concierge.py` (LLM-driven decompose prompt → metas por fase), `engage.py`, `explore.py`, `explain.py`, `elaborate.py`, `evaluate.py` (PEVR loop por recurso), `validate.py` (html_validator), `assemble.py` (SCORM builder)
- `tools/`: `llm_generate.py` (wrapper generar_texto), `rag_search.py`
- `plans/`: `two_step.py` (texto→JSON→HTML), `direct_code.py` (código directo), `podcast.py` (TTS)

### Nuevos prompts: 3 fases (3 archivos, ~400 líneas)
- `explain_prompts.py`: 10 recursos de teoría (Video, Lectura, Mapa Conceptual, FAQ, Demo, Glosario, Timeline, Diagrama, Tabla, Infografía)
- `elaborate_prompts.py`: 10 recursos de aplicación (Caso, Ejercicio, Proyecto, Simulación, Análisis, Escenario, Lab, Problemas, Estrategia, Reto)
- `evaluate_prompts.py`: 10 recursos de evaluación (Quiz, Rúbrica, Desafío, Examen, Completar, Relacionar, Crucigrama, Desarrollo, Simulación, Diploma)

### Integraciones (6 archivos modificados)
- `jobs_runner.py`: refactorizado — loop manual reemplazado por `invoke_ova_generation()` con LangGraph checkpointing
- `jobs_helpers.py`: `_DEFAULT_PLAN` y `_PHASE_ORDER` extendidos a 5 fases
- `regen_agents.py`: dispatch a 5 fases + mappings de name→id para las 3 nuevas
- `jobs_materialize.py`: `_resolve_type` maneja las 5 fases
- `requirements.txt`: + `langgraph>=0.6.0`, `langgraph-checkpoint-postgres>=2.0.0`
- `feature_list.json`: EN-003 `in_progress`

### Flujo del grafo
```
concierge (LLM orquestador: prompt → metas) → engage | explore | explain | elaborate | evaluate
  → validate (html_validator) → OK? → next resource/phase → assemble → END
                         → retry → fase correspondiente
```

### Verificación
- FE: ESLint ✓
- BE: ruff ✓
- unit BDD: 52/52 ✓

**Estado:** completo. Pendiente: commit.
