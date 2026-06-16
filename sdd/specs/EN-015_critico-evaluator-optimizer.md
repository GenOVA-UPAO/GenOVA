# EN-015: Crítico — evaluator-optimizer pedagógico por recurso

> Metadata:

| Campo | Valor |
|---|---|
| ID | EN-015 |
| Tipo | Habilitador |
| Épica/Tema | EP5: Especificación del Sistema Multiagente |
| Sprint | Sprint 2 |
| Status | spec_ready |
| Prioridad | Alta |
| Estimación | 5 SP |
| Dependencia | EN-013 |
| Responsable | — |
| Fase | SDD - Implement |
| Fecha creación | 2026-06-15 |
| Fecha actualización | — |
| Fecha Fin (info) | 2026-06-21 |

## Objetivo

Añadir el rol **Crítico** al motor Prometheus: un evaluator-optimizer pedagógico que evalúa
cada recurso generado con una rúbrica de 4 criterios y, si detecta problemas, solicita
una re-generación acotada (máx `OVA_REFLECTION_ROUNDS`, default 1). Implementa la
primera fase del "Equipo editorial pedagógico" diseñado en
`docs/arquitectura-equipo-editorial.md`. Todo bajo el flag `OVA_CRITIC=0` (default off),
de modo que el comportamiento actual queda intacto cuando el flag no está activado.

## Contexto

El motor actual (`maybe_refine` en `prometheus/refine.py`) detecta defectos **estructurales**
(HTML roto, botones sin JS) y los corrige en una sola pasada. No evalúa **calidad pedagógica**
(¿enseña el concepto?, ¿cumple el objetivo 5E de su fase?, ¿es correcto?). El Crítico extiende
ese mecanismo hacia evaluación de contenido, usando la misma infraestructura de llamadas LLM y
el mismo patrón best-effort (nunca bloquea un recurso).

Diseño de referencia: `docs/arquitectura-equipo-editorial.md` § "Rol nuevo 1 — Crítico".
Metodología: GAIA (`docs/metodologia-gaia.md`).

## Alcance

### Incluye
- Nuevo archivo `backend/prometheus/critic.py` con `critique_resource(...)`.
- Extensión de `OvaGenerationState` con campos `score` y `critic_issues` en cada result dict.
- Campo top-level `coherence_report: dict` en el state (vacío en EN-015; usado en EN-016).
- 3 nuevas vars en `backend/config.py`: `ova_critic`, `ova_reflection_rounds`, `ova_editor`.
- Bucle Generador-Crítico acotado en `backend/prometheus/runtime.py` (`_work` dentro de `run_phase`).
- Extracción de `_apply_feedback` en `backend/prometheus/refine.py` (reutilizado por el bucle).
- Tests BDD en `backend/tests/step_defs/test_ova_critic.py`.

### No incluye
- Editor de Coherencia 5E (→ EN-016).
- Map-reduce plano / quitar barrera por fase (→ futuro).
- Cambios a los nodos de fase (`nodes/engage.py`, etc.) ni a `graph.py`.
- UI para mostrar puntajes del Crítico.

## Dependencias

- **EN-013** (jobs + runtime paralelo): `run_phase` y `_persist_done` que ya existen.
- Reusa: `llm.router.generar_texto`, `llm.utils.strip_markdown`, `llm.html_validator.validate_html`,
  `llm.themes.build_design_system`, `prometheus.refine._quality_issues`.

## Reglas de negocio

1. **R1** — `OVA_CRITIC=0` (default): el Crítico no se invoca; comportamiento actual exacto.
2. **R2** — Cuando `OVA_CRITIC=1`: tras cada `dispatch(...)` en `_work`, se llama
   `critique_resource(...)`. Si `veredicto=="revisar"` y `ronda < OVA_REFLECTION_ROUNDS`,
   se re-genera pasando `problemas` como feedback; se conserva la mejor versión por `puntaje`.
3. **R3** — Reflexión **ACOTADA**: máx `OVA_REFLECTION_ROUNDS` rondas (default 1). Nunca
   un loop infinito.
4. **R4** — Fallo del Crítico (excepción) → aceptar el HTML actual. Nunca aborta el recurso.
5. **R5** — Cada result dict incluye `score: int` y `critic_issues: list[str]` (0 y [] si el
   Crítico está apagado).
6. **R6** — El Crítico usa `enabled_models` + fallback chain existente; nunca llama directamente
   a un provider.

## Contrato de `critique_resource`

```python
def critique_resource(
    html: str,
    phase: str,
    rt: int,
    concept: str,
    llm_config: dict,
    enabled_models: list[dict],
    theme: dict,
) -> dict:
    """Devuelve {"puntaje": 0-100, "problemas": [str], "veredicto": "aceptar"|"revisar"}."""
```

### Rúbrica (4 criterios, en el prompt al LLM)

1. **Fidelidad pedagógica** — ¿enseña el concepto y cumple el objetivo 5E de su fase?
2. **Adecuación tipo/formato** — ¿el HTML es coherente con el tipo de recurso (cómic, quiz…)?
3. **Interactividad real** — ¿los handlers JS están presentes (`addEventListener`/`onclick`)?
4. **Correctitud** — ¿sin errores conceptuales ni datos inventados fuera del JSON de entrada?

El LLM responde en JSON `{"puntaje": N, "problemas": [...], "veredicto": "aceptar"|"revisar"}`.
El parser debe ser robusto (buscar el JSON con regex si la respuesta incluye texto extra).
Si el parse falla → retornar `{"puntaje": 0, "problemas": [], "veredicto": "aceptar"}` (fallar
hacia aceptar, nunca bloquear).

## Cambio en `runtime.py` — bucle Generador-Crítico en `_work`

```python
def _work(item):
    rt = item["resource_type"]
    try:
        html = dispatch(rt, concept, llm_config, enabled_models, theme, image_settings)
        score, issues = 0, []
        if _critic_enabled():
            html, score, issues = _critic_loop(
                html, phase, rt, concept, llm_config, enabled_models, theme,
                dispatch, item,
            )
        return item, html, None, score, issues
    except Exception:
        logger.exception("%s resource %s failed", phase, rt)
        return item, None, str(exc), 0, []
```

`_critic_loop` implementa el bucle acotado: llama `critique_resource`, si revisar y ronda<MAX
llama `_apply_feedback` (de `refine.py`), guarda la mejor por puntaje.

## Cambio en `refine.py` — extraer `_apply_feedback`

Extraer de `_refine_prompt` + llamada LLM la función pública:

```python
def apply_feedback(
    html: str, concept: str, feedback: list[str], phase: str, rt: int,
    llm_config=None, enabled_models=None, theme=None
) -> str:
    """Re-generate HTML incorporating explicit feedback list. Best-effort."""
```

`maybe_refine` sigue existiendo sin cambios (structural-only, controlada por `OVA_REFINE`).

## Criterios de aceptación

- Con `OVA_CRITIC=0` (default): `verify.ps1 -Quick` pasa, los tests existentes pasan, sin cambio de comportamiento. **(R1)**
- Con `OVA_CRITIC=1` y mock LLM que retorna `veredicto=="revisar"` la primera vez y `"aceptar"` la segunda: el recurso se genera dos veces y el result dict incluye `score > 0` y `critic_issues` no vacío. **(R2, R3, R5)**
- Con `OVA_CRITIC=1` y Crítico que lanza excepción: el recurso se acepta igual (sin error). **(R4)**
- Con `OVA_CRITIC=1` y `OVA_REFLECTION_ROUNDS=0`: el Crítico evalúa pero nunca re-genera. **(R3)**
- `critic.py` ≤ 120 líneas. `runtime.py` ≤ 200 líneas (puede requerir extraer helpers).
- `verify.ps1 -Quick` pasa siempre. **(C3)**

## Escenarios BDD (Gherkin)

```gherkin
Feature: Crítico evaluator-optimizer (EN-015)

  Scenario: Crítico apagado — sin cambio de comportamiento
    Given OVA_CRITIC no está configurado (default 0)
    When se genera un recurso de tipo 1 en fase "engage"
    Then el result dict no incluye "score" ni "critic_issues"
    And el recurso se genera exactamente una vez

  Scenario: Crítico acepta un recurso de calidad
    Given OVA_CRITIC=1 y un LLM mock que retorna veredicto "aceptar" con puntaje 85
    When se genera un recurso de tipo 1 en fase "engage"
    Then el result dict incluye score=85 y critic_issues=[]
    And el recurso se genera exactamente una vez

  Scenario: Crítico re-genera un recurso defectuoso
    Given OVA_CRITIC=1 y OVA_REFLECTION_ROUNDS=1
    And un LLM mock que retorna veredicto "revisar" puntaje 40 en ronda 0
    And el mismo LLM retorna veredicto "aceptar" puntaje 78 en ronda 1
    When se genera un recurso de tipo 2 en fase "explore"
    Then el recurso se genera dos veces (ronda 0 + regeneración con feedback)
    And el result dict incluye score=78

  Scenario: Crítico con rondas=0 evalúa pero no re-genera
    Given OVA_CRITIC=1 y OVA_REFLECTION_ROUNDS=0
    And un LLM mock que retorna veredicto "revisar"
    When se genera un recurso
    Then el recurso se genera exactamente una vez
    And el result dict incluye el puntaje del Crítico

  Scenario: Crítico falla — recurso aceptado igual
    Given OVA_CRITIC=1 y el LLM del Crítico lanza una excepción
    When se genera un recurso
    Then el recurso se acepta sin error
    And score=0 y critic_issues=[]
```

## Notas de implementación

- `_critic_loop` debe vivir en `runtime.py` (co-ubicada con `_work`) para no cruzar módulos.
- El prompt del Crítico debe incluir: `phase`, `resource_type`, `concept`, y el HTML completo.
  Máx 8 000 tokens de salida (solo JSON, respuesta corta).
- Si `runtime.py` supera 200 líneas con los cambios, extraer `_critic_loop` + `_apply_feedback`
  a `prometheus/critic_loop.py` (helpers internos).
- El Crítico se llama con `"texto"` (no `"codigo"`) en el router — la evaluación es texto, no
  código HTML.
