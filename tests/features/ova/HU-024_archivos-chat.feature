# Cubre HU-024 a nivel unit (sin browser/backend): validación del límite de
# adjuntos — vive en frontend/src/features/ova-workspace/lib/upload-chip-view-model.ts.
# El estado de cada archivo (subiendo, indexando, listo, no se usará y por qué)
# lo resuelve frontend/src/features/ova-workspace/lib/upload-rag-status.ts y
# lo cubre su spec de vitest.
Feature: Archivos contextuales estilo chat — viewmodel (HU-024)

  Scenario: Rechazo por exceder el límite de archivos
    Given un estudiante con 5 archivos adjuntos
    When intenta adjuntar 1 archivo más
    Then se produce un error indicando el límite de 5 archivos
    And el archivo no se adjunta

  Scenario: Rechazo no ocurre si no se supera el límite
    Given un estudiante con 3 archivos adjuntos
    When intenta adjuntar 2 archivos más
    Then no hay error de validación
