# Escenario EJECUTABLE e2e para HU-013 (duplicar OVA). La feature verbatim vive
# en tests/features/ova/HU-013_duplicar-ova.feature. Requiere LLM_FAKE=1.
Feature: HU-013 e2e — Duplicar OVA existente

  Scenario: Duplicar crea una copia visible en el historial
    Given que estoy autenticado como usuario con rol "usuario"
    And tengo un OVA listo generado vía API con título único
    When navego a Mis OVAs y localizo el OVA sembrado
    And duplico el OVA sembrado desde su card
    Then aparece la copia del OVA sembrado en la lista
