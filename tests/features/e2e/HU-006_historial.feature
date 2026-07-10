# Escenarios EJECUTABLES e2e para HU-006 (historial / Mis OVAs). La feature
# verbatim (con datos sembrados exactos) vive en tests/features/ova/HU-006_historial.feature;
# los conteos exactos y la paginación se cubren en unit/backend. Requiere LLM_FAKE=1.
Feature: HU-006 e2e — Historial de OVAs (Mis OVAs)

  Scenario: La búsqueda por título encuentra el OVA propio
    Given que estoy autenticado como usuario con rol "usuario"
    And tengo un OVA listo generado vía API con título único
    When navego a Mis OVAs y localizo el OVA sembrado
    Then el OVA sembrado aparece en el listado

  Scenario: Una cuenta nueva ve el estado vacío del historial
    Given que estoy autenticado con una cuenta recién creada
    When navego a "/mis-ovas"
    Then veo el estado vacío de Mis OVAs
