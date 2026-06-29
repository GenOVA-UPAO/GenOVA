# Review — EN-015 Crítico evaluator-optimizer + EN-016 Editor de Coherencia 5E

**Veredicto:** APPROVED

## Trazabilidad criterios ↔ tests

### EN-015

| Criterio | Test |
|---|---|
| R1 — `OVA_CRITIC=0` default: sin cambio de comportamiento | [x] `test_critico_apagado` — Scenario 1 |
| R2 — `OVA_CRITIC=1`, mock revisar→aceptar, result incluye score > 0 | [x] `test_critico_regenera` — Scenario 3 (score=78, 2 critique calls) |
| R3 — Bucle acotado por `OVA_REFLECTION_ROUNDS` | [x] `test_critico_rondas_cero` — Scenario 4 (ROUNDS=0, 1 call, no re-gen) |
| R4 — Fallo del Crítico → acepta HTML actual, nunca crash | [x] `test_critico_falla` — Scenario 5 (score=0, errors=[]) |
| R5 — `score` y `critic_issues` en cada result dict | [x] `test_critico_apagado` (score=0, []), `test_critico_acepta` (score=85) |
| R6 — Crítico usa `enabled_models` + fallback chain existente | [x] `critique_resource` llama `generar_texto` de `llm.router` |

### EN-016

| Criterio | Test |
|---|---|
| R1 — `OVA_EDITOR=0` default: noop, retorna `{}` | [x] `test_editor_apagado` — Scenario 1 |
| R2 — Editor consume `html[:600]`, no el HTML completo | [x] `editor.py:90` — `r.get("html", "")[:600]`, verificado en código |
| R3 — Parches con anti-regresión ≥80% longitud | [x] `editor.py:63` — `len(html_nuevo) >= len(html_viejo) * 0.8` |
| R4 — 1 sola pasada LLM por OVA | [x] 1 call a `generar_texto` en `editor_node` (sin bucle) |
| R5 — Fallo → `coherence_report={}`, sin crash | [x] `test_editor_falla` — Scenario 3 |

## Lint + ruff

- pnpm lint: [x] OK (Biome — 174 archivos, 0 errores)
- ruff check backend/: [x] OK (`All checks passed!`)

## Tests

- pnpm test:unit: [x] OK (57 scenarios, 246 steps — sin regresiones)
- pytest step_defs: [x] OK (45/45 PASSED — 5 EN-015 + 3 EN-016 + 37 existentes)

## Auto-fix de tests

No aplica — todos los tests pasaron sin intervención.

## Checkpoints

- C1: [x] `pytest tests/step_defs/ -v` → 45/45 PASSED. `pnpm test:unit` → 57/57 PASSED.
- C2: [x] `pnpm lint` exit 0. `ruff check .` exit 0.
- C3: [x] `critic.py` 80 líneas, `critic_loop.py` 65, `editor.py` 107, `graph.py` 74, `runtime.py` 172, `refine.py` 107. Todos ≤200. Los de test están exentos.
- C4: [x] Sin tokens/OTPs en respuestas. Sin `str(e)` en nuevos archivos. `str(exc)` en `runtime.py:67` existente va a lista interna de errores (LangGraph state), nunca a HTTP. Sin rate-limit nuevo porque no hay endpoints nuevos.
- C5: [x] Mapa R→test documentado en `sdd/progress/implementados/impl_critico-evaluator-optimizer.md` y `sdd/progress/implementados/impl_editor-coherencia-5e.md`.
- C6: [x] `verify.ps1 -Quick` PASA. Sin print() de debug en archivos nuevos.
- C7: [x] Backend sigue patrón: `graph.py` (routing) → `nodes/editor.py` (lógica) → `state.py` (ORM-libre). `refine.py` extraído correctamente como helper. Sin lógica de negocio en router HTTP.
- C8: N/A — features sin `## Mockup ASCII` en specs.

## Checks adicionales

- G (Docs al día): [x] OK con nota. EN-015/016 son flags internos off-by-default, sin nuevos endpoints ni cambio de arranque. `docs/arquitectura-equipo-editorial.md` tiene `Estado: diseño (no implementado)` que es ahora incorrecto (rol Crítico y Editor implementados). No es un endpoint público ni instrucción de arranque → no bloquea, pero se recomienda que `doc_author` actualice ese campo.
- H (Migración BD): [x] N/A — no se modificaron `models.py` ni schemas. Solo lógica de generación.

## Investigación adicional: propagación in-place de parches (EN-016 R3)

El advisor señaló que `editor_node` aplica parches in-place sobre `results` pero retorna solo `{"coherence_report": report}`. Se verificó empíricamente con el mismo `MemorySaver` del runtime:

- `MemorySaver.put` usa `serde.dumps_typed` (JsonPlusSerializer), que serializa por valor.
- Sin embargo, LangGraph pasa el objeto de estado mutable entre nodos en la **misma invocación** `invoke()` antes de checkpointing: la mutación in-place llega a `assemble_node` como `results` correctamente modificado.
- Test directo ejecutado: `node_editor` mutó `results[0]["html"]` sin retornarlo; `node_assemble` recibió la versión modificada. `Final results` contenía el texto parchado.
- Conclusión: la implementación es correcta para el caso de uso (una sola invocación de generación). Si en el futuro se usara PostgresSaver con reanudación entre sesiones, los parches se perderían si el estado se restaura desde checkpoint; pero ese path está deshabilitado por defecto (`OVA_PG_CHECKPOINT` opt-in) y los parches son mejoras opcionales.

## Reconciliación feature_list.json

EN-015 y EN-016 no tenían entradas en `feature_list.json`. Se agregaron como parte de esta revisión:

```json
{ "id": "EN-015", "name": "critico-evaluator-optimizer", "title": "Crítico evaluator-optimizer pedagógico por recurso", "spec": "sdd/specs/EN-015_critico-evaluator-optimizer.md", "status": "done" },
{ "id": "EN-016", "name": "editor-coherencia-5e", "title": "Editor de Coherencia 5E", "spec": "sdd/specs/EN-016_editor-coherencia-5e.md", "status": "done" },
```

## Desviaciones del spec documentadas (no bloquean)

1. `critic.py` usa `html[:2000]` (extracto) en el prompt del Crítico, no el HTML completo. El spec dice "HTML completo" en las notas de implementación. Decisión razonable para no saturar contexto; max_tokens reducido a 512 (spec dice 8000). No hay criterio de aceptación que lo exija explícitamente.
2. Scenario 1 del spec Gherkin dice "no incluye 'score' ni 'critic_issues'" pero R5 dice incluirlos en 0/[]. La implementación siguió R5 y el test verifica R5. La inconsistencia es interna al spec.

### Auto-actualización aplicada

No se aplicaron cambios a archivos de configuración de lint/checkpoints.
