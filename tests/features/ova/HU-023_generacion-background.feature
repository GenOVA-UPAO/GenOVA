# Cubre HU-023 a nivel unit (sin browser/backend): lógica del viewmodel de
# progreso de job — done/total counts y estados terminales.
Feature: Generación en background y reanudación — viewmodel (HU-023)

  Scenario: Progreso se calcula correctamente desde recursos del job
    Given un job con 8 recursos donde 3 están "done"
    When se calcula el progreso del job
    Then el progreso muestra 3 de 8

  Scenario: Un job en estado terminal no necesita más polling
    Given un job con status "done"
    When se evalúa si el job requiere polling
    Then el job no requiere polling

  Scenario: Un job en estado activo requiere polling
    Given un job con status "running"
    When se evalúa si el job requiere polling
    Then el job requiere polling

  Scenario: Un job interrumpido se identifica correctamente
    Given un job con status "interrupted"
    When se evalúa si el job está interrumpido
    Then el job está interrumpido
