# Cubre HU-029 a nivel unit (sin browser/backend): lógica de numeración
# de micro-versiones por recurso (vN.M minor versioning).
Feature: Micro-versionado por recurso (HU-029)

  Scenario: El primer minor de un recurso es 1
    Given un recurso sin micro-versiones previas
    When se calcula el siguiente número de micro-versión
    Then el número de micro-versión es 1

  Scenario: El minor incrementa con cada edición
    Given un recurso con 3 micro-versiones previas
    When se calcula el siguiente número de micro-versión
    Then el número de micro-versión es 4

  Scenario: El historial está ordenado de más reciente a más antiguo
    Given micro-versiones con números 1, 2 y 3
    When se ordenan las micro-versiones de más reciente a más antigua
    Then el primer elemento tiene minor_number 3
