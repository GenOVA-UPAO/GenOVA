# Cubre HU-025 a nivel unit (sin browser/backend): lógica de split ratio
# y estado del workspace — vive en WorkspaceResizableDivider y getSavedRatio.
Feature: Workspace de edición OVA — split panel (HU-025)

  Scenario: El ratio del divider se clampea al mínimo
    Given un drag hasta una posición de ratio 0.1
    When se clampea el ratio
    Then el ratio resultante es 0.25

  Scenario: El ratio del divider se clampea al máximo
    Given un drag hasta una posición de ratio 0.9
    When se clampea el ratio
    Then el ratio resultante es 0.65

  Scenario: Un ratio válido no se modifica
    Given un drag hasta una posición de ratio 0.4
    When se clampea el ratio
    Then el ratio resultante es 0.4

  Scenario: El workspace muestra el título del OVA
    Given un OVA con título "Árboles de decisión"
    When se carga el workspace
    Then el título visible es "Árboles de decisión"
