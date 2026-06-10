# Extraído verbatim de sdd/specs/HU-014_renombrar_y_editar_metadatos_del_ova.md § Escenarios BDD (Gherkin)
Feature: HU-014 — Renombrar y Editar Metadatos del OVA

  Background:
    Given el usuario "ana@upao.edu" está autenticado
    And existe un OVA activo "Introducción a Regresión" con id "ov-1"

  Scenario: CA-01 — Abrir modal de edición
    When la usuaria hace clic en "Editar metadatos" de la tarjeta "ov-1"
    Then se abre un modal con los campos "Título" y "Descripción"
    And ambos campos aparecen precargados con los datos actuales del OVA

  Scenario: CA-02 — Rechazo por título vacío
    Given la usuaria abrió el modal de "ov-1"
    When borra el título y hace clic en "Guardar"
    Then el sistema muestra "El título es obligatorio"
    And no se envía actualización exitosa

  Scenario: CA-03 — Rechazo por longitud excedida
    Given la usuaria abrió el modal de "ov-1"
    When ingresa un título con 101 caracteres y hace clic en "Guardar"
    Then el sistema muestra "El título no puede superar 100 caracteres"
    And no se persisten cambios

  Scenario: CA-04 — Guardado y actualización inmediata
    Given la usuaria abrió el modal de "ov-1"
    When ingresa título y descripción válidos y confirma
    Then el backend responde éxito
    And la tarjeta "ov-1" muestra el nuevo título y descripción sin recargar

  Scenario: CA-05 — Error de persistencia
    Given la usuaria abrió el modal de "ov-1"
    When confirma guardado y el backend falla
    Then se muestra un mensaje de error
    And la tarjeta mantiene los metadatos anteriores
