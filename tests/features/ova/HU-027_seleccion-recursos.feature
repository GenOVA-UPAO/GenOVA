# Cubre HU-027 a nivel unit (sin browser/backend): lógica de selección
# de recursos para acotar el contexto del prompt de regeneración.
Feature: Selección de recursos como contexto (HU-027)

  Scenario: Seleccionar un recurso lo agrega a la lista
    Given no hay recursos seleccionados
    When el usuario marca el recurso "phase-abc"
    Then "phase-abc" está en la lista de seleccionados

  Scenario: Deseleccionar un recurso lo elimina de la lista
    Given el recurso "phase-abc" está seleccionado
    When el usuario desmarca el recurso "phase-abc"
    Then la lista de seleccionados está vacía

  Scenario: Sin selección el prompt aplica a todos
    Given no hay recursos seleccionados
    When se construye la llamada al regen
    Then fase_ids está vacío

  Scenario: Con selección el prompt aplica solo a los marcados
    Given los recursos "p1" y "p2" están seleccionados
    When se construye la llamada al regen
    Then fase_ids contiene "p1" y "p2"
