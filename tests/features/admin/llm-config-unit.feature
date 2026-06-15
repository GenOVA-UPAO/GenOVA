# Cubre la lógica pura del panel admin de modelos LLM (sin browser/backend):
# reordenar/agregar/quitar fallback y la transformación draft↔payload.
# Importa frontend/src/lib/llmConfigDraft.js (código real, no replicado).
Feature: Config admin de modelos LLM — lógica de panel (unit)

  Scenario: Reordenar la cadena de fallback hacia arriba
    Given una cadena de fallback "groq:a,openrouter:b,groq:c"
    When muevo el fallback en índice 2 con dirección -1
    Then la cadena resultante es "groq:a,groq:c,openrouter:b"

  Scenario: Mover fuera de rango no cambia nada
    Given una cadena de fallback "groq:a,openrouter:b"
    When muevo el fallback en índice 0 con dirección -1
    Then la cadena resultante es "groq:a,openrouter:b"

  Scenario: Agregar y quitar fallback
    Given una cadena de fallback "groq:a"
    When agrego un fallback vacío
    Then la cadena tiene 2 elementos
    When quito el fallback en índice 0
    Then la cadena resultante es ":"

  Scenario: toPayload descarta entries sin modelo y preserva orden
    Given un draft de tarea "codigo" con primario "openrouter:deepseek/deepseek-v4-flash" y fallbacks "groq:llama-3.3-70b-versatile,:"
    When construyo el payload
    Then el payload tiene default "openrouter:deepseek/deepseek-v4-flash" para "codigo"
    And el payload tiene 1 fallback para "codigo"

  Scenario: toPayload omite la tarea si el primario no tiene modelo
    Given un draft de tarea "texto" con primario ":" y fallbacks ""
    When construyo el payload
    Then el payload no incluye "texto" en defaults
