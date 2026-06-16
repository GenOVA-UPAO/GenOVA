Feature: Editor de Coherencia 5E (EN-016)

  Scenario: Editor apagado — noop
    Given OVA_EDITOR está en "0"
    And el state tiene 2 recursos generados
    When se ejecuta editor_node
    Then retorna dict vacío sin coherence_report

  Scenario: Editor detecta inconsistencia y aplica parche
    Given OVA_EDITOR está en "1"
    And el state tiene resultados con texto "término X" en fase "explore"
    And el LLM mock retorna hallazgos y parches con reemplazo de "término X" por "término Y"
    When se ejecuta editor_node
    Then coherence_report incluye hallazgos y parches
    And el resultado de la fase "explore" ya no contiene "término X"

  Scenario: Editor falla — continúa sin crash
    Given OVA_EDITOR está en "1"
    And el LLM del Editor lanza excepción
    And el state tiene 1 recurso generado
    When se ejecuta editor_node
    Then retorna coherence_report vacío sin error
