# Cubre HU-033 a nivel unit (sin browser/backend): lógica de reordenamiento
# de recursos dentro de una fase — funciones puras sin DOM ni red.
Feature: Reordenar recursos del OVA (HU-033)

  Scenario: Reordenar dentro de la misma fase cambia el orden
    Given una fase con recursos en el orden "A,B,C"
    When el estudiante arrastra el recurso del índice 2 al índice 0
    Then el orden resultante es "C,A,B"

  Scenario: Mover al mismo índice no cambia nada
    Given una fase con recursos en el orden "A,B,C"
    When el estudiante arrastra el recurso del índice 1 al índice 1
    Then el orden resultante es "A,B,C"

  Scenario: El backend rechaza reordenamiento entre fases distintas
    Given reorders con phase_types "actividad" y "evaluacion"
    When se valida que todos pertenecen a la misma fase
    Then la validación falla por tipos distintos

  Scenario: El backend acepta reordenamiento dentro de la misma fase
    Given reorders con phase_types "actividad" y "actividad"
    When se valida que todos pertenecen a la misma fase
    Then la validación pasa
