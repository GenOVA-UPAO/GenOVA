# Cubre HU-032 a nivel unit (sin browser/backend): validación de límite
# máx 4 recursos por fase y habilitación del botón.
Feature: Añadir recurso al OVA (HU-032)

  Scenario: Se puede añadir si hay menos de 4 recursos
    Given una fase con 2 recursos
    When se verifica si se puede añadir otro recurso
    Then se puede añadir

  Scenario: No se puede añadir si ya hay 4 recursos
    Given una fase con 4 recursos
    When se verifica si se puede añadir otro recurso
    Then no se puede añadir

  Scenario: El prompt vacío es inválido para añadir
    Given una fase con 1 recurso
    When se intenta añadir con prompt vacío
    Then el intento es inválido

  Scenario: Prompt con contenido es válido
    Given una fase con 1 recurso
    When se intenta añadir con prompt "Añadir un ejemplo de clustering"
    Then el intento es válido
