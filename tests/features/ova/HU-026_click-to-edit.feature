# Cubre HU-026 a nivel unit (sin browser/backend): lógica de acciones
# por recurso — editar, regenerar, eliminar — funciones puras.
Feature: Edición de recurso por click (HU-026)

  Scenario: Eliminar única fase falla validación
    Given una versión con 1 fase
    When se intenta eliminar la única fase
    Then la eliminación es rechazada por ser la última

  Scenario: Eliminar fase de varias deja el resto
    Given una versión con 3 fases
    When se elimina la fase del índice 1
    Then quedan 2 fases

  Scenario: Editar con contenido vacío es inválido
    Given un recurso con contenido "hola"
    When se edita con contenido vacío
    Then la edición es inválida

  Scenario: Editar con contenido válido es aceptado
    Given un recurso con contenido "hola"
    When se edita con contenido "nuevo contenido"
    Then la edición es válida
