# EN-015 — Crítico evaluator-optimizer pedagógico
# Tests del bucle Generador-Crítico en run_phase, con critique_resource mockeado.
Feature: Crítico evaluator-optimizer (EN-015)

  Scenario: Crítico apagado — sin cambio de comportamiento
    Given OVA_CRITIC está en "0"
    When se ejecuta run_phase con un recurso mock
    Then el result dict no incluye score ni critic_issues distintos de cero

  Scenario: Crítico acepta un recurso de calidad
    Given OVA_CRITIC está en "1" y OVA_REFLECTION_ROUNDS en "1"
    And el LLM del Crítico retorna veredicto "aceptar" con puntaje 85
    When se ejecuta run_phase con un recurso mock
    Then el result dict incluye score=85 y critic_issues vacío

  Scenario: Crítico re-genera un recurso defectuoso
    Given OVA_CRITIC está en "1" y OVA_REFLECTION_ROUNDS en "1"
    And el LLM del Crítico retorna veredicto "revisar" puntaje 40 en primera llamada
    And el LLM del Crítico retorna veredicto "aceptar" puntaje 78 en segunda llamada
    When se ejecuta run_phase con un recurso mock
    Then el result dict incluye score=78 y critique fue llamado dos veces

  Scenario: Crítico con rondas=0 evalúa pero no re-genera
    Given OVA_CRITIC está en "1" y OVA_REFLECTION_ROUNDS en "0"
    And el LLM del Crítico retorna veredicto "revisar" con puntaje 50
    When se ejecuta run_phase con un recurso mock
    Then el Crítico fue invocado exactamente una vez

  Scenario: Crítico falla — recurso aceptado igual
    Given OVA_CRITIC está en "1"
    And el LLM del Crítico lanza excepción
    When se ejecuta run_phase con un recurso mock
    Then el recurso se acepta sin error y score=0
