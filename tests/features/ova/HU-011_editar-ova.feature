# Extraído verbatim de specs/HU-011_editar_ova_generado.md § Escenarios BDD (Gherkin)
Feature: HU-011 — Editar OVA Generado

  Background:
    Given el usuario "ana@upao.edu" está autenticado con rol "usuario"
    And existe el OVA "Redes Neuronales" con id "ova-1" creado por "ana@upao.edu"
    And el OVA "ova-1" tiene status "listo" y está en versión v1
    And el OVA "ova-1" tiene las fases: "motivacion", "contenido", "actividad", "evaluacion", "cierre"

  Scenario: CA-01 — Botón Editar visible para el creador
    When "ana@upao.edu" navega a "/mis-ovas"
    Then ve el botón "Editar" habilitado en la card "Redes Neuronales"
    When hace clic en "Editar"
    Then es redirigida a "/mis-ovas/ova-1/editar"

  Scenario: CA-02 — Botón Editar deshabilitado en estado generando
    Given el OVA "ova-1" tiene status "generando"
    When "ana@upao.edu" navega a "/mis-ovas"
    Then el botón "Editar" del OVA "Redes Neuronales" está deshabilitado
    And al pasar el cursor muestra "No disponible mientras se genera el OVA"

  Scenario: CA-03 — Usuario no creador no puede editar
    Given el usuario "juan@upao.edu" está autenticado con rol "usuario"
    When "juan@upao.edu" accede a "/mis-ovas/ova-1/editar"
    Then recibe un error 403
    And ve el mensaje "No tienes permiso para editar este OVA"

  Scenario: CA-04 — Regenerar OVA completo con prompt modificado
    Given "ana@upao.edu" está en "/mis-ovas/ova-1/editar"
    When modifica el prompt a "Redes neuronales profundas aplicadas a visión artificial"
    And presiona "Regenerar OVA completo"
    Then aparece un diálogo de confirmación con el texto "¿Regenerar todas las fases con el nuevo prompt?"
    When confirma la acción
    Then el OVA cambia a status "generando"
    And se muestra un indicador de progreso en la página
    When la generación finaliza
    Then el OVA cambia a status "listo"
    And el número de versión pasa a v2
    And el prompt guardado en v2 es "Redes neuronales profundas aplicadas a visión artificial"
    And todas las fases tienen contenido nuevo

  Scenario: CA-05 — Editar texto de una fase sin IA
    Given "ana@upao.edu" está en "/mis-ovas/ova-1/editar"
    When presiona "Editar" en la fase "motivacion"
    And modifica el texto en el editor a "Nuevo contenido de motivación"
    And presiona "Guardar fase"
    Then el cambio se guarda sin mostrar indicador de regeneración IA
    And el número de versión pasa a v2
    And la fase "motivacion" en v2 muestra "Nuevo contenido de motivación"
    And las demás fases permanecen sin cambios

  Scenario: CA-06 — Vista previa en tiempo real
    Given "ana@upao.edu" está editando la fase "contenido" en "/mis-ovas/ova-1/editar"
    When escribe "Texto de ejemplo" en el editor
    Then el panel de vista previa muestra "Texto de ejemplo" simultáneamente

  Scenario: CA-07 — Regenerar una sola fase con IA
    Given "ana@upao.edu" está en "/mis-ovas/ova-1/editar"
    When presiona el botón "Regenerar" de la fase "actividad"
    Then aparece un diálogo de confirmación con el texto "¿Regenerar la fase 'Actividad'?"
    When confirma la acción
    Then solo la fase "actividad" muestra indicador de carga
    And las fases "motivacion", "contenido", "evaluacion", "cierre" permanecen visibles y sin cambios
    When la regeneración finaliza
    Then el número de versión pasa a v2
    And solo la fase "actividad" tiene contenido nuevo

  Scenario: CA-08 — Regenerar múltiples fases seleccionadas
    Given "ana@upao.edu" está en "/mis-ovas/ova-1/editar"
    When marca los checkboxes de las fases "contenido" y "evaluacion"
    And presiona "Regenerar seleccionadas"
    Then aparece un diálogo de confirmación listando "Contenido, Evaluación"
    When confirma la acción
    Then solo las fases "contenido" y "evaluacion" son regeneradas por IA
    And el número de versión pasa a v2

  Scenario: CA-09 — Versionado incremental
    Given el OVA "ova-1" está en v1
    When "ana@upao.edu" guarda la edición de la fase "cierre"
    Then el OVA pasa a v2
    When vuelve a editar la fase "motivacion"
    Then el OVA pasa a v3
    And el historial muestra las versiones v1, v2 y v3

  Scenario: CA-10 — Historial de versiones visible
    Given el OVA "ova-1" tiene las versiones v1 y v2 archivadas
    And "ana@upao.edu" está en "/mis-ovas/ova-1/editar"
    When despliega el panel "Historial de versiones"
    Then ve una lista con v1 y v2
    And cada entrada muestra número de versión, fecha y prompt usado

  Scenario: CA-11 — Exportar SCORM con contenido actualizado
    Given el OVA "ova-1" está en v2 con status "listo"
    And "ana@upao.edu" está en "/mis-ovas/ova-1/editar"
    When presiona "Exportar SCORM"
    Then el navegador descarga el archivo "Redes_Neuronales_v2.zip"
    And el archivo contiene el contenido de la versión v2
