# Escenarios EJECUTABLES e2e para HU-004 (exportar SCORM). La feature verbatim
# vive en tests/features/ova/HU-004_exportar-scorm.feature; la estructura interna
# del paquete la valida backend/tests/test_scorm_package.py. Requiere LLM_FAKE=1.
Feature: HU-004 e2e — Exportar OVA como paquete SCORM

  Background:
    Given que estoy autenticado como usuario con rol "usuario"
    And tengo un OVA listo generado vía API con título único

  Scenario: El botón Descargar está habilitado para el OVA listo
    When navego a Mis OVAs y localizo el OVA sembrado
    Then el botón Descargar del OVA sembrado está habilitado

  Scenario: La descarga entrega un archivo zip
    When navego a Mis OVAs y localizo el OVA sembrado
    And descargo el OVA desde su card
    Then se descarga un archivo zip del OVA
