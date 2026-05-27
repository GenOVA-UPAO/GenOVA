# Extraído verbatim de specs/HU-012_eliminar_ova_historial.md § Escenarios BDD (Gherkin)
Feature: HU-012 — Eliminar OVA del Historial con Papelera

  Background:
    Given el usuario "ana@upao.edu" está autenticado con rol "usuario"
    And existen los siguientes OVAs activos para "ana@upao.edu":
      | id   | title                | status    |
      | ov-1 | Redes Neuronales     | listo     |
      | ov-2 | Regresión Lineal     | borrador  |
      | ov-3 | SVM Clasificación    | generando |

  Scenario: CA-01 — Botón visible y habilitado en historial
    When "ana@upao.edu" navega a "/mis-ovas"
    Then ve el botón "Mover a la papelera" habilitado en los OVAs "ov-1" y "ov-2"

  Scenario: CA-02 — Botón deshabilitado durante generación
    When "ana@upao.edu" navega a "/mis-ovas"
    Then el botón "Mover a la papelera" del OVA "ov-3" está deshabilitado
    And al pasar el cursor muestra "No se puede eliminar mientras se está generando"

  Scenario: CA-03 — Mover a papelera individual
    When "ana@upao.edu" hace clic en "Mover a la papelera" del OVA "ov-1"
    Then aparece un modal con el texto "¿Mover 'Redes Neuronales' a la papelera?"
    When confirma la acción
    Then el OVA "ov-1" desaparece de "/mis-ovas"
    And aparece una notificación "OVA movido a la papelera"
    And el OVA "ov-1" aparece en "/papelera"

  Scenario: CA-04 y CA-05 — Selección múltiple y mover en lote
    When "ana@upao.edu" navega a "/mis-ovas"
    And selecciona los checkboxes de "ov-1" y "ov-2"
    Then aparece la barra de acciones con el botón "Mover a la papelera (2)"
    When presiona "Mover a la papelera (2)"
    Then aparece un modal con el texto "¿Mover 2 OVAs a la papelera?"
    When confirma
    Then "ov-1" y "ov-2" desaparecen de "/mis-ovas"
    And aparece la notificación "2 OVAs movidos a la papelera"

  Scenario: CA-06 — Página de papelera lista OVAs eliminados
    Given el OVA "ov-1" fue movido a la papelera
    When "ana@upao.edu" navega a "/papelera"
    Then ve el OVA "Redes Neuronales" con su fecha de eliminación
    And cada card tiene los botones "Restaurar" y "Borrar definitivamente"

  Scenario: CA-07 — Restaurar OVA individual
    Given el OVA "ov-1" está en la papelera
    And "ana@upao.edu" está en "/papelera"
    When presiona "Restaurar" del OVA "ov-1"
    Then "ov-1" desaparece de "/papelera"
    And aparece en "/mis-ovas" con su estado original
    And muestra la notificación "OVA restaurado correctamente"

  Scenario: CA-08 — Borrar definitivamente OVA individual
    Given el OVA "ov-1" está en la papelera con archivo SCORM en el servidor
    And "ana@upao.edu" está en "/papelera"
    When presiona "Borrar definitivamente" del OVA "ov-1"
    Then aparece un modal con el texto "¿Eliminar permanentemente 'Redes Neuronales'? Esta acción no se puede deshacer."
    When confirma
    Then "ov-1" desaparece de "/papelera"
    And el registro es eliminado de la base de datos
    And el archivo SCORM es eliminado del servidor
    And muestra la notificación "OVA eliminado permanentemente"

  Scenario: CA-09, CA-10 — Restaurar múltiples OVAs desde papelera
    Given los OVAs "ov-1" y "ov-2" están en la papelera
    And "ana@upao.edu" está en "/papelera"
    When selecciona los checkboxes de "ov-1" y "ov-2"
    Then aparece la barra de acciones con "Restaurar (2)" y "Borrar definitivamente (2)"
    When presiona "Restaurar (2)"
    Then "ov-1" y "ov-2" desaparecen de "/papelera"
    And aparecen en "/mis-ovas"
    And muestra la notificación "2 OVAs restaurados correctamente"

  Scenario: CA-11 — Borrar definitivamente múltiples OVAs
    Given los OVAs "ov-1" y "ov-2" están en la papelera
    And "ana@upao.edu" está en "/papelera"
    When selecciona "ov-1" y "ov-2" y presiona "Borrar definitivamente (2)"
    Then aparece un modal "¿Eliminar permanentemente 2 OVAs? Esta acción no se puede deshacer."
    When confirma
    Then "ov-1" y "ov-2" son eliminados de la BD y sus archivos SCORM del servidor
    And muestra la notificación "2 OVAs eliminados permanentemente"

  Scenario: CA-12 — Borrado sin archivo SCORM no genera error
    Given el OVA "ov-2" está en la papelera sin archivo SCORM (status "borrador")
    And "ana@upao.edu" está en "/papelera"
    When presiona "Borrar definitivamente" y confirma
    Then "ov-2" es eliminado de la BD sin error al usuario
    And muestra la notificación "OVA eliminado permanentemente"

  Scenario: CA-13 — Estado vacío de papelera
    Given "ana@upao.edu" no tiene OVAs en la papelera
    When navega a "/papelera"
    Then ve el mensaje "Tu papelera está vacía"
    And no se muestra listado de OVAs

  Scenario: CA-14 — Badge de conteo en menú
    Given "ana@upao.edu" tiene 3 OVAs en la papelera
    When ve el menú lateral
    Then el enlace "Papelera" muestra el badge "3"

  Scenario: CA-15 — Checkbox "seleccionar todos"
    Given "ana@upao.edu" está en "/papelera" con 4 OVAs visibles
    When hace clic en el checkbox de la cabecera
    Then los 4 OVAs quedan seleccionados
    When hace clic de nuevo en el checkbox de la cabecera
    Then todos los OVAs quedan deseleccionados
