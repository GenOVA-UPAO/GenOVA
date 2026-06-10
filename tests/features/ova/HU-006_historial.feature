# Extraído verbatim de sdd/specs/HU-006_ver_historial_de_ovas.md § Escenarios BDD (Gherkin)
Feature: HU-006 — Ver historial de OVAs

  Background:
    Given el usuario "ana@upao.edu" está autenticado con rol "usuario"
    And existen los siguientes OVAs para "ana@upao.edu":
      | id | title                   | status     |
      | 1  | Redes Neuronales        | listo      |
      | 2  | Regresión Lineal        | borrador   |
      | 3  | Árboles de Decisión     | error      |
      | 4  | SVM Clasificación       | generando  |

  Scenario: CA-01 — Ver lista de OVAs propios
    When navego a "/mis-ovas"
    Then veo exactamente 4 cards de OVAs
    And están ordenados por fecha de creación descendente
    And cada card muestra título, fecha y badge de estado

  Scenario: CA-02 — Paginación con más de 10 OVAs
    Given existen 15 OVAs para "ana@upao.edu"
    When navego a "/mis-ovas"
    Then veo 10 OVAs en la primera página
    And veo el control de paginación con "Página 1 de 2"
    When hago clic en "Siguiente"
    Then veo los 5 OVAs restantes

  Scenario: CA-03 — Búsqueda por título
    When navego a "/mis-ovas"
    And escribo "Redes" en el campo de búsqueda
    Then veo únicamente el OVA "Redes Neuronales"
    And el contador muestra "1 resultado"

  Scenario: CA-04 — Filtro por estado
    When navego a "/mis-ovas"
    And selecciono el filtro "listo"
    Then veo únicamente el OVA "Redes Neuronales"

  Scenario: CA-05 — Búsqueda y filtro combinados sin resultados
    When navego a "/mis-ovas"
    And escribo "Redes" en el campo de búsqueda
    And selecciono el filtro "error"
    Then veo el estado vacío con el mensaje "Sin resultados para tu búsqueda"

  Scenario: CA-06 — Descargar OVA en estado listo
    When navego a "/mis-ovas"
    And hago clic en "Descargar" del OVA "Redes Neuronales"
    Then el navegador inicia la descarga del paquete SCORM

  Scenario: CA-07 — Botón Descargar deshabilitado para estado borrador
    When navego a "/mis-ovas"
    Then el botón "Descargar" del OVA "Regresión Lineal" está deshabilitado

  Scenario: CA-08 — Eliminar OVA con confirmación
    When navego a "/mis-ovas"
    And hago clic en "Eliminar" del OVA "Regresión Lineal"
    Then aparece un modal con el texto "¿Eliminar 'Regresión Lineal'?"
    When confirmo la eliminación
    Then el OVA "Regresión Lineal" desaparece de la lista
    And aparece una notificación "OVA eliminado correctamente"

  Scenario: CA-09 — Eliminar bloqueado en estado generando
    When navego a "/mis-ovas"
    Then el botón "Eliminar" del OVA "SVM Clasificación" está deshabilitado
    And al pasar el cursor muestra "No se puede eliminar mientras se está generando"

  Scenario: CA-10 — Estado vacío sin OVAs
    Given "ana@upao.edu" no tiene OVAs creados
    When navego a "/mis-ovas"
    Then veo el mensaje "Aún no has creado ningún OVA"
    And veo el botón "Crear mi primer OVA"

  Scenario: CA-11 — Vista de administrador ve todos los OVAs
    Given el usuario "admin@upao.edu" está autenticado con rol "administrador"
    When navega a "/mis-ovas"
    Then ve OVAs de todos los usuarios
    And cada card muestra el nombre del propietario
