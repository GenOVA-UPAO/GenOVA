# Cubre HU-031 a nivel unit (sin browser/backend): lógica de detección
# de sub-elementos y manejo del 501 fallback.
Feature: Edición granular de sub-elementos (HU-031)

  Scenario: Un tipo de fase sin soporte devuelve 501
    Given una fase de tipo "actividad" sin soporte granular
    When se intenta editar un sub-elemento
    Then el resultado es 501 no implementado

  Scenario: Identificador de sub-elemento vacío es inválido
    Given un sub-elemento sin identificador
    When se valida el sub-elemento
    Then la validación falla

  Scenario: Identificador de sub-elemento válido
    Given un sub-elemento con id "sec-intro"
    When se valida el sub-elemento
    Then la validación pasa correctamente
