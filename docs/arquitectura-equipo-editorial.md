# Arquitectura objetivo — Equipo editorial pedagógico (diseño)

> **Propuesta de arquitectura multiagente** para la generación de OVAs. Evoluciona el motor actual
> (orchestrator-workers plano; ver [prometheus.md](prometheus.md)) hacia un **equipo editorial** con
> roles que **colaboran vía crítica**, donde el multi-agente aporta valor real: **calidad
> pedagógica** y **coherencia del arco 5E**. Metodología de diseño: **GAIA** (extiende el modelo de
> roles de [metodologia-gaia.md](metodologia-gaia.md)). Framework: **LangGraph**.
>
> Estado: **diseño** (no implementado). Sección [Rollout](#rollout-por-fases) define cómo prototipar.

---

## Motivación

Hoy cada recurso se genera de forma aislada y solo pasa por validación **mecánica** de HTML +
`maybe_refine` (1 corrección estructural). No hay:
- evaluación de **calidad pedagógica** (¿enseña de verdad el concepto y cumple el objetivo 5E?);
- **coherencia entre recursos** (las 5 fases deberían contar *una* historia con terminología y
  progresión consistentes; hoy son islas).

Ahí es donde un sistema multiagente gana sobre un pipeline plano: **agentes especializados que
revisan y mejoran** el trabajo de otros. Esa es la arquitectura "especial" y, a la vez, útil.

---

## Topología (LangGraph)

```
Concierge (Supervisor/Planner)
   │  plan → map-reduce plano: todos los recursos en paralelo acotado
   ▼
┌───────────────── subgrafo por recurso (reflexión acotada) ─────────────────┐
│  Generador → Crítico ──revisar?──► (sí, ronda<MAX) re-generar con feedback  │
│      ▲                              (no | MAX) ► aceptar mejor               │
└──────┴──────────────────────────────────────────────────────────────────────┘
   ▼  (resultados + puntajes en la pizarra = state compartido)
Editor de Coherencia 5E   ← revisa el arco completo; parches dirigidos / reporte
   ▼
Assembler → SCORM
```

**Roles nuevos**: `Crítico` y `Editor`. Los demás (Concierge, ResourceGenerator, Assembler,
Orchestrator) se mantienen del diseño GAIA actual. La pizarra es el `OvaGenerationState`.

Mecanismos LangGraph usados: **subgrafo** por recurso (Generador-Crítico), **aristas condicionales
con contador de rondas** (reflexión acotada), **reduce/join** antes del Editor, **supervisor**
(Concierge). Patrón Anthropic equivalente: *evaluator-optimizer* (Generador-Crítico) +
*orchestrator-workers* (Concierge-Generadores).

---

## Rol nuevo 1 — Crítico (Generator-Critic, evaluator-optimizer)

Evalúa cada recurso recién generado y decide si se acepta o se re-genera con feedback. Evoluciona
`prometheus/refine.py` de "arreglo estructural" a "crítica pedagógica + técnica".

**Contrato de E/S**
- Entrada: `html`, `phase`, `resource_type`, `concept`, objetivo de la fase.
- Salida (JSON): `{ "puntaje": 0-100, "problemas": [str], "veredicto": "aceptar" | "revisar" }`.

**Rúbrica de evaluación**
1. **Fidelidad pedagógica**: ¿enseña el concepto y cumple el objetivo 5E de su fase?
2. **Adecuación al tipo/formato** (cómic, simulador, quiz…).
3. **Interactividad real**: handlers JS reales (extiende el chequeo "botones muertos" actual).
4. **Correctitud**: sin errores conceptuales ni datos inventados fuera del JSON.

**Bucle de reflexión (acotado, OBLIGATORIO)**
- `veredicto == "revisar"` y `ronda < OVA_REFLECTION_ROUNDS` (default **1**) → re-generar pasando
  `problemas` como feedback; conservar la mejor versión por puntaje.
- Si no → aceptar la mejor hasta ahora. **Nunca bloquea**; fallo del crítico → aceptar actual.
- Esto preserva la resiliencia: la reflexión es por-recurso, acotada y dentro del pool paralelo —
  no reintroduce el loop infinito que causó la "carga indefinida".

---

## Rol nuevo 2 — Editor de Coherencia 5E

Tras el *reduce* (todos los recursos listos), revisa el **arco completo** del OVA antes de ensamblar.

**Contrato de E/S**
- Entrada: lista ordenada de recursos (título + extracto/HTML) por `(phase, order)`.
- Salida: `coherence_report` + parches dirigidos opcionales.

**Qué revisa**
- **Terminología/analogía consistente** entre fases (ej. misma metáfora del Engage retomada).
- **Progresión cognitiva** 5E (hook → manipular → formalizar → aplicar → evaluar) sin saltos.
- **Sin repeticiones ni contradicciones** entre recursos.
- **Transiciones** coherentes de una fase a la siguiente.

**Alcance acotado**: v1 = **reporte + parches ligeros dirigidos** (ej. unificar un término),
aceptados solo si no regresionan (mismo criterio que `maybe_refine`). 1 sola pasada por OVA.

---

## Estado compartido (extensiones)

| Campo nuevo en `OvaGenerationState` | Tipo | Uso |
|---|---|---|
| `results[i].score` | `int` | Puntaje del Crítico (para elegir mejor versión / métricas) |
| `results[i].critic_issues` | `list[str]` | Problemas detectados (auditoría / Editor) |
| `coherence_report` | `dict` | Salida del Editor (hallazgos + parches aplicados) |

---

## Configuración (degradación elegante)

Todo bajo flags; apagados = comportamiento actual exacto (sin coste extra).

| Env | Default | Efecto |
|---|---|---|
| `OVA_CRITIC` | `0` (prototipo) → `1` | Activa el Crítico |
| `OVA_REFLECTION_ROUNDS` | `1` | Máx. re-generaciones por recurso |
| `OVA_EDITOR` | `0` → `1` | Activa el Editor de coherencia |

Coste cuando activos (con concurrencia, en paralelo): Crítico +1 LLM/recurso; reflexión hasta
+`ROUNDS` LLM/recurso; Editor +1 LLM/OVA.

---

## Puntos de integración (archivos)

| Archivo | Cambio |
|---|---|
| `prometheus/state.py` | `score`, `critic_issues`, `coherence_report` |
| `prometheus/critic.py` (nuevo) | Rol Crítico: prompt-rúbrica + parser de veredicto |
| `prometheus/refine.py` | Refactor: refine pasa a ser el "re-generar con feedback" del bucle |
| `prometheus/runtime.py` | `run_phase` invoca el subgrafo Generador-Crítico por recurso |
| `prometheus/nodes/editor.py` (nuevo) | Nodo Editor 5E, entre el reduce y `assemble` |
| `prometheus/graph.py` | Insertar nodo `editor`; (opcional) aplanar a map-reduce |
| `prometheus/nodes/assemble.py` | Consumir `coherence_report` / parches |

---

## Mapeo a metodología y patrones

- **GAIA** (diseño): dos roles nuevos (`Crítico`, `Editor`) con sus responsabilidades, permisos y
  protocolos; siguen la topología en estrella (colaboran vía la pizarra, no entre sí). Nueva regla
  organizacional: *"ningún recurso se ensambla sin pasar por el Crítico (si está activo)"*.
- **Patrones de runtime**: orchestrator-workers (Concierge) + **evaluator-optimizer**
  (Generador-Crítico) + un paso de **agregación-revisión** (Editor). Todos nativos de LangGraph.

---

## Métricas (para evidenciar la mejora)

Para defender que el multi-agente aporta, medir antes/después:
- **Puntaje medio del Crítico** por recurso (sube con reflexión).
- **% recursos aceptados sin revisión** vs **mejorados por reflexión**.
- **Hallazgos de coherencia** por OVA (y cuántos corrige el Editor).
- **Tiempo de pared** y **nº de LLM calls** (coste del trade-off).

---

## Rollout por fases

1. **Crítico** (subgrafo Generador-Crítico, `OVA_REFLECTION_ROUNDS=1`) — mayor valor/calidad, riesgo
   bajo si el bucle queda acotado. Reusa la infraestructura de `refine.py`.
2. **Editor 5E** (modo reporte primero; parches después) — coherencia del arco.
3. **Map-reduce plano** (opcional, ver [metodologia-gaia.md](metodologia-gaia.md)) — velocidad.

Cada fase detrás de su flag, con tests BDD nuevos y verificación con `verify.ps1`. Sería una
feature SDD (spec → implementer → reviewer).

---

## Referencias

- [metodologia-gaia.md](metodologia-gaia.md) — Metodología de diseño (roles/interacciones)
- [prometheus.md](prometheus.md) — Motor de runtime actual
- [fases-5e.md](fases-5e.md) — Catálogo de recursos + prompts
- Anthropic, *Building Effective Agents* — evaluator-optimizer, orchestrator-workers
- LangGraph docs — subgraphs, reflection, supervisor
