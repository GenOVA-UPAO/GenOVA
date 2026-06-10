# Extraído verbatim de sdd/specs/HU-002_crear_nuevo_ova_desde_prompt.md § Escenarios BDD (Gherkin)
Feature: Crear nuevo OVA desde prompt

  Scenario: Generación exitosa con datos válidos
    Given que el usuario está en la pantalla "Crear nuevo OVA"
    And existen modelos LLM habilitados por SP-001
    When ingresa un prompt válido
    And selecciona un modelo LLM
    And presiona "Generar"
    Then el sistema inicia la generación del OVA
    And muestra barra de progreso con porcentaje exacto y etapa actual
    And deshabilita el botón "Generar" durante el proceso
    And al finalizar muestra progreso en 100% y resultado exitoso

  Scenario: Validación de prompt obligatorio
    Given que el usuario está en la pantalla "Crear nuevo OVA"
    When intenta generar sin ingresar prompt
    Then el sistema muestra "El prompt es obligatorio"
    And no inicia la generación

  Scenario: Validación de longitud mínima
    Given que el usuario está en la pantalla "Crear nuevo OVA"
    And la longitud mínima está configurada
    When ingresa un prompt por debajo del mínimo
    Then el sistema muestra el mensaje de longitud mínima requerida
    And no inicia la generación

  Scenario: Sin modelos LLM habilitados
    Given que no existen modelos habilitados por SP-001
    When el usuario abre la pantalla "Crear nuevo OVA"
    Then el selector LLM aparece deshabilitado o vacío con mensaje informativo
    And el botón "Generar" no permite iniciar el proceso
