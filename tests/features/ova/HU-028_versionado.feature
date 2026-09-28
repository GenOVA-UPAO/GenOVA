# Cubre HU-028 a nivel unit (sin browser/backend): lógica de versiones
# — ordenamiento, versión activa, selección para diff.
Feature: Versionado de OVA (HU-028)

  Scenario: Las versiones se listan en orden descendente
    Given un historial con versiones 1, 2 y 3
    When se ordenan de más reciente a más antigua
    Then el orden es 3, 2, 1

  Scenario: Se pueden seleccionar dos versiones para diff
    Given un historial con versiones 1, 2 y 3
    When el usuario selecciona las versiones 1 y 3
    Then hay dos versiones seleccionadas para diff
