# Cubre HU-024 a nivel unit (sin browser/backend): lógica de chips de adjuntos
# y validación de límites — vive en frontend/src/lib/uploadChipViewModel.js.
Feature: Archivos contextuales estilo chat — viewmodel (HU-024)

  Scenario: Adjuntar un archivo crea un chip en estado "subiendo"
    Given un estudiante sin archivos adjuntos
    When adjunta un archivo llamado "apuntes.pdf" de 1200000 bytes
    Then aparece un chip con nombre "apuntes.pdf"
    And el estado del chip se describe como "subiendo"

  Scenario: El chip muestra "listo" tras subida exitosa
    Given un chip con estado "success"
    When se obtiene su etiqueta de estado
    Then la etiqueta de estado es "listo"

  Scenario: Rechazo por exceder el límite de archivos
    Given un estudiante con 5 archivos adjuntos
    When intenta adjuntar 1 archivo más
    Then se produce un error indicando el límite de 5 archivos
    And el archivo no se adjunta

  Scenario: Rechazo no ocurre si no se supera el límite
    Given un estudiante con 3 archivos adjuntos
    When intenta adjuntar 2 archivos más
    Then no hay error de validación
