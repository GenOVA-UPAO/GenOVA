# Extraído de sdd/specs/HU-003_visualizar-completa-5E.md § Escenarios BDD (Gherkin)
# INC-003: Scenario "Botón Editar deshabilitado" actualizado — HU-011 ya implementado.
# El botón Editar ahora está habilitado y redirige al editor. Referencia "Sprint 2" eliminada.
Feature: Visualizar completa 5E

  Scenario: Vista previa aparece tras generación exitosa
    Given el estudiante ha completado el formulario de generación de OVA
    When el proceso de generación alcanza el 100% y devuelve ova_content
    Then el sistema muestra la sección "Vista previa del OVA — Modelo 5E"
    And presenta 5 pestañas: Enganche, Exploración, Explicación, Elaboración, Evaluación
    And la primera pestaña (Enganche) aparece activa por defecto

  Scenario: Navegación entre fases por pestañas
    Given la vista previa del OVA está visible con las 5 pestañas
    When el estudiante hace clic en la pestaña "Explicación"
    Then el contenido de la fase Explicación se muestra completo
    And las demás pestañas quedan inactivas visualmente
    And no hay truncamiento del contenido en pantalla

  Scenario: Renderizado de contenido enriquecido
    Given la vista previa muestra la fase activa con contenido generado
    Then los encabezados se renderizan con jerarquía visual correcta
    And los párrafos se muestran con texto completo sin corte
    And las listas ordenadas muestran numeración y las desordenadas viñetas
    And los bloques de código muestran el lenguaje y formato monoespaciado

  # INC-003: Botón Editar ahora habilitado (HU-011 implementado). Antes decía "deshabilitado Sprint 2".
  Scenario: Botón Editar habilitado por fase
    Given la vista previa del OVA está visible
    When el estudiante visualiza cualquier fase
    Then cada fase muestra un botón "Editar" habilitado
    And al hacer clic redirige a la página de edición del OVA

  Scenario: Vista previa se reinicia al generar un nuevo OVA
    Given la vista previa del OVA generado está visible
    When el estudiante modifica el prompt y presiona "Generar OVA" nuevamente
    Then la vista previa anterior desaparece inmediatamente
    And se muestra el indicador de progreso de la nueva generación
    And al completarse la nueva generación aparece la vista previa actualizada

  Scenario: Sin contenido generado no se muestra la vista
    Given el estudiante acaba de abrir la página "Crear OVA"
    And no ha completado ninguna generación
    Then la sección de vista previa 5E no está visible en la interfaz
