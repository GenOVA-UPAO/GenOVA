# EN-015 — Crítico evaluator-optimizer pedagógico

## Trazabilidad criterios de aceptación

| Criterio AC (spec) | Test BDD |
|---|---|
| R1 — OVA_CRITIC=0: sin cambio de comportamiento, tests existentes pasan | Scenario 1: "Crítico apagado — sin cambio de comportamiento"; 42/42 tests pass |
| R2/R3/R5 — OVA_CRITIC=1, mock revisar→aceptar, result incluye score=78, critique llamado 2 veces | Scenario 3: "Crítico re-genera un recurso defectuoso" |
| R3 — OVA_REFLECTION_ROUNDS=0: evalúa (1 llamada) pero no re-genera | Scenario 4: "Crítico con rondas=0 evalúa pero no re-genera" |
| R4 — Crítico lanza excepción, recurso aceptado igual (score=0) | Scenario 5: "Crítico falla — recurso aceptado igual" |
| C3 — verify.ps1 -Quick pasa siempre | Verificado: PASA |
| critic.py ≤120 líneas | 80 líneas |
| runtime.py ≤200 líneas | 173 líneas |

## Notas de diseño (desviaciones vs spec AC)

- Spec línea 144 desea que critic_issues sea "no vacío" en el escenario regen. La task
  instruction mantiene `critic_issues` en el result dict siempre (R5) con los últimos
  issues del crítico; el test de regen verifica score=78 (solo alcanzable si 2 rondas
  ejecutaron), lo que prueba R2/R3 de forma más fuerte.
- Spec escenario 1 dice "no incluye 'score'"; la task dice incluir score=0/[]. Se
  siguió la task (resultado dict siempre lleva las claves), alineado con R5.

## Archivos modificados/creados

- `backend/config.py` — ova_critic, ova_reflection_rounds, ova_editor añadidos
- `backend/prometheus/state.py` — coherence_report field añadido
- `backend/prometheus/critic.py` — NUEVO, critique_resource() (80 líneas)
- `backend/prometheus/critic_loop.py` — NUEVO, critic_loop() + _critic_enabled()
- `backend/prometheus/refine.py` — apply_feedback() extraído; maybe_refine() lo reutiliza
- `backend/prometheus/runtime.py` — _work() + as_completed loop actualizados (173 líneas)
- `tests/features/setup/EN-015_critico.feature` — NUEVO (5 escenarios)
- `backend/tests/step_defs/test_ova_critic_steps.py` — NUEVO (5 tests)

## Verificación final

- `verify.ps1 -Quick` → PASA (lint + ruff + unit tests)
- `uv run pytest tests/step_defs/test_ova_critic_steps.py -v` → 5/5 PASSED
- `uv run pytest tests/step_defs/ -v` → 42/42 PASSED (sin regresiones)
