# Extraído verbatim de sdd/specs/HU-013_duplicar_ova_existente.md § Escenarios BDD (Gherkin)
Feature: HU-013 — Duplicar OVA Existente

  Background:
    Given el usuario "ana@upao.edu" está autenticado con rol "usuario"
    And existe el OVA "Redes Neuronales" con id "ov-1" de "ana@upao.edu"
    And el OVA "ov-1" tiene status "listo" y versión activa v2 con 5 fases

  Scenario: CA-01 — Botón Duplicar visible en historial
    When "ana@upao.edu" navega a "/mis-ovas"
    Then ve el botón "Duplicar" habilitado en la card de "Redes Neuronales"

  Scenario: CA-02 — Botón deshabilitado durante generación
    Given el OVA "ov-1" tiene status "generando"
    When "ana@upao.edu" navega a "/mis-ovas"
    Then el botón "Duplicar" del OVA "ov-1" está deshabilitado
    And al pasar el cursor muestra "No disponible mientras se genera el OVA"

  Scenario: CA-03 — Duplicación exitosa y redirección al editor
    When "ana@upao.edu" hace clic en "Duplicar" del OVA "Redes Neuronales"
    Then el botón muestra "Duplicando..." y se deshabilita temporalmente
    And se crea un nuevo OVA con título "Redes Neuronales (copia)" y status "borrador"
    And "ana@upao.edu" es redirigida a "/mis-ovas/{nuevo_id}/editar"
    And el editor muestra las mismas 5 fases que tenía la versión activa v2 del original

  Scenario: CA-04 — El duplicado aparece en el historial
    Given el duplicado "Redes Neuronales (copia)" fue creado
    When "ana@upao.edu" navega a "/mis-ovas"
    Then "Redes Neuronales (copia)" aparece primero en el listado
    And muestra el badge "Borrador" y la fecha actual

  Scenario: CA-05 — Independencia entre original y duplicado
    Given existe el duplicado "Redes Neuronales (copia)" con id "ov-2"
    When "ana@upao.edu" edita la fase "motivacion" del duplicado "ov-2"
    And guarda los cambios
    Then el OVA original "ov-1" conserva su contenido sin cambios
    And el duplicado "ov-2" tiene el contenido actualizado en su versión v2

  Scenario: CA-06 — Nombre auto-incremental
    Given ya existe el OVA "Redes Neuronales (copia)" para "ana@upao.edu"
    When "ana@upao.edu" duplica nuevamente "Redes Neuronales"
    Then el nuevo duplicado se llama "Redes Neuronales (copia 2)"

  Scenario: CA-07 — El duplicado inicia sin SCORM
    Given el OVA "ov-1" tiene status "listo" con archivo SCORM disponible
    When "ana@upao.edu" duplica "ov-1"
    Then el duplicado tiene status "borrador"
    And el botón "Descargar" del duplicado aparece deshabilitado

  Scenario: CA-08 — Fases copiadas son independientes
    Given el duplicado hereda las fases de la versión activa del original
    When "ana@upao.edu" regenera la fase "actividad" del duplicado
    Then solo el duplicado tiene la fase "actividad" regenerada
    And el OVA original conserva su fase "actividad" intacta

  Scenario: CA-09 — Estado de carga sin doble envío
    When "ana@upao.edu" hace clic en "Duplicar"
    Then el botón cambia a "Duplicando..." y no puede presionarse de nuevo
    When la operación finaliza
    Then el botón vuelve a su estado normal en la card original
