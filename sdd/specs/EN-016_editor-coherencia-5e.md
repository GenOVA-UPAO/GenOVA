# EN-016: Editor de Coherencia 5E

> Metadata:

| Campo | Valor |
|---|---|
| ID | EN-016 |
| Tipo | Habilitador |
| Épica/Tema | EP5: Especificación del Sistema Multiagente |
| Sprint | Sprint 2 |
| Status | spec_ready |
| Prioridad | Media |
| Estimación | 3 SP |
| Dependencia | EN-015 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-06-15 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-06-21 |

## Objetivo

Añadir el rol **Editor de Coherencia 5E** al motor Prometheus: un nodo LangGraph que revisa
el arco completo del OVA (todos los recursos ya generados) antes de ensamblar, detecta
inconsistencias pedagógicas entre fases y aplica parches ligeros dirigidos. Implementa la
segunda fase del "Equipo editorial pedagógico" (`docs/arquitectura-equipo-editorial.md`).
Todo bajo el flag `OVA_EDITOR=0` (default off).

## Contexto

Tras EN-015 cada recurso es evaluado por el Crítico individualmente. Pero el OVA como un
todo puede tener problemas de coherencia: la misma metáfora usada en Engage no se retoma en
Explore, un término cambia entre fases, la progresión cognitiva 5E tiene saltos. El Editor
revisa el arco completo en una sola pasada (1 LLM call por OVA) y aplica parches mínimos.

Diseño de referencia: `docs/arquitectura-equipo-editorial.md` § "Rol nuevo 2 — Editor de Coherencia 5E".

## Alcance

### Incluye
- Nuevo archivo `backend/prometheus/nodes/editor.py` con `editor_node(state) -> dict`.
- Inserción del nodo `editor` en `backend/prometheus/graph.py` entre las fases y `assemble`.
- Log de `coherence_report` en `backend/prometheus/nodes/assemble.py`.
- Tests BDD en `backend/tests/step_defs/test_ova_editor.py`.

### No incluye
- UI para mostrar el coherence_report.
- Parches que modifican estructura HTML profunda (solo texto/términos).
- Map-reduce plano (→ futuro).

## Dependencias

- **EN-015**: campos `score`, `critic_issues`, `coherence_report` en `OvaGenerationState` ya existentes.
- Reusa: `llm.router.generar_texto`, `llm.utils.strip_markdown`.

## Reglas de negocio

1. **R1** — `OVA_EDITOR=0` (default): `editor_node` es noop, retorna `{}`. El grafo no cambia funcionalmente.
2. **R2** — Cuando `OVA_EDITOR=1`: el Editor recibe la lista ordenada de resultados `(phase, title, html[:600])` — extracto para no saturar el contexto LLM.
3. **R3** — El Editor produce `coherence_report = {"hallazgos": [...], "parches": [...]}`. Los parches son cambios de texto mínimos (ej. unificar un término); se aplican solo si no acortan el HTML (anti-regresión, mismo criterio que `maybe_refine`).
4. **R4** — 1 sola pasada por OVA (1 LLM call). Nunca bloquea el ensamble.
5. **R5** — Fallo del Editor → continuar con `coherence_report = {}` y ensamblar igual.

## Contrato del nodo

```python
def editor_node(state: OvaGenerationState) -> dict:
    """Nodo LangGraph: revisa coherencia 5E del arco completo.

    Noop cuando OVA_EDITOR != "1". Best-effort: fallo → estado sin cambio.
    Retorna dict con "results" (parches aplicados) y "coherence_report".
    """
```

### Qué revisa (prompt al LLM)

1. **Terminología/analogía consistente** entre fases (ej. misma metáfora del Engage retomada).
2. **Progresión cognitiva 5E** (hook → manipular → formalizar → aplicar → evaluar) sin saltos.
3. **Sin repeticiones ni contradicciones** entre recursos.
4. **Transiciones** coherentes de una fase a la siguiente.

Salida JSON del LLM:
```json
{
  "hallazgos": ["hallazgo 1", "hallazgo 2"],
  "parches": [
    {"phase": "explore", "buscar": "texto exacto", "reemplazar": "texto corregido"}
  ]
}
```

## Cambio en `graph.py`

```python
# Añadir:
from prometheus.nodes.editor import editor_node
graph.add_node("editor", editor_node)

# Cambiar routing: fases → editor → assemble
# Antes: fase → assemble (cuando idx >= len(phase_order))
# Después: fase → editor (cuando idx >= len(phase_order))
# editor → assemble (edge fija)
```

El router `_route_next_phase` retorna `"editor"` en lugar de `"assemble"` cuando las fases
terminan; `editor_node` termina con edge fija a `assemble`.

## Criterios de aceptación

- Con `OVA_EDITOR=0` (default): grafo funciona exactamente igual que antes; `verify.ps1 -Quick` pasa. **(R1)**
- Con `OVA_EDITOR=1` y ≥2 recursos en state: `editor_node` llama el LLM, produce `coherence_report` con campos `hallazgos` y `parches`, y los parches válidos se aplican a `results`. **(R2, R3)**
- Con `OVA_EDITOR=1` y el LLM del Editor lanzando excepción: el ensamble continúa con `coherence_report={}`. **(R5)**
- `editor.py` ≤ 120 líneas. `graph.py` ≤ 80 líneas.
- `verify.ps1 -Quick` pasa siempre. **(C3)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Editor de Coherencia 5E (EN-016)

  Scenario: Editor apagado — noop
    Given OVA_EDITOR no está configurado (default 0)
    And el state tiene 3 recursos generados
    When se ejecuta editor_node
    Then retorna dict vacío
    And results no cambia

  Scenario: Editor detecta inconsistencia y aplica parche
    Given OVA_EDITOR=1
    And el state tiene resultados con terminología inconsistente entre fases
    And el LLM mock retorna hallazgos=["término X varía"] y parches=[{buscar: "X", reemplazar: "Y", phase: "explore"}]
    When se ejecuta editor_node
    Then coherence_report incluye hallazgos y parches
    And el resultado de la fase "explore" contiene "Y" en lugar de "X"

  Scenario: Editor falla — ensamble continúa
    Given OVA_EDITOR=1 y el LLM del Editor lanza excepción
    And el state tiene 2 recursos generados
    When se ejecuta editor_node
    Then retorna coherence_report vacío
    And results no cambia (sin crash)
```

## Notas de implementación

- Usar `html[:600]` (extracto) de cada recurso en el prompt para no superar el contexto LLM.
- El parser JSON debe ser robusto (mismo patrón que `critic.py`).
- La aplicación de parches debe ser un simple `str.replace(buscar, reemplazar, 1)` — si la
  cadena no está presente, ignorar el parche (silenciosamente).
- El nodo retorna `{"results": results_parchados, "coherence_report": report}`. LangGraph usa
  el `Annotated[list, operator.add]` de `results`, así que el nodo debe retornar la lista
  completa reemplazada, no un delta — usar un campo separado o sobreescribir directamente.
  **Alternativa limpia**: retornar `{"coherence_report": report}` y aplicar parches in-place
  antes de retornar (state es mutable dentro del nodo).
