# Escenarios EJECUTABLES e2e para HU-025/HU-030/HU-003 (workspace unificado).
# Las variantes unit viven en tests/features/ova/HU-025_workspace.feature y
# HU-030_mis-ovas-workspace.feature. Requiere LLM_FAKE=1.
Feature: HU-025 e2e — Workspace de edición del OVA

  Background:
    Given que estoy autenticado como usuario con rol "usuario"
    And tengo un OVA listo generado vía API con título único

  Scenario: El botón Editar de la card abre el workspace del OVA
    When navego a Mis OVAs y localizo el OVA sembrado
    And abro el workspace del OVA sembrado desde su card
    Then el workspace muestra el título del OVA sembrado
    And el workspace muestra el botón de descarga SCORM

  Scenario: El workspace lista los recursos generados de las fases
    When navego a Mis OVAs y localizo el OVA sembrado
    And abro el workspace del OVA sembrado desde su card
    Then el workspace muestra los recursos generados de las fases seleccionadas
