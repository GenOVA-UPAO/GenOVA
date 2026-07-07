# Escenarios EJECUTABLES e2e para HU-012 (papelera). La feature verbatim (con
# fixtures exactos y selección múltiple) vive en tests/features/ova/HU-012_eliminar-ova.feature;
# la selección en lote se cubre en unit/backend. Requiere LLM_FAKE=1.
Feature: HU-012 e2e — Eliminar OVA con papelera

  Scenario: Mover a papelera y restaurar
    Given que estoy autenticado como usuario con rol "usuario"
    And tengo un OVA listo generado vía API con título único
    When navego a Mis OVAs y localizo el OVA sembrado
    And muevo el OVA sembrado a la papelera
    Then el OVA sembrado ya no aparece en Mis OVAs
    And el OVA sembrado aparece en la papelera
    When restauro el OVA sembrado desde la papelera
    Then el OVA sembrado vuelve a Mis OVAs

  Scenario: Borrar definitivamente desde la papelera
    Given que estoy autenticado como usuario con rol "usuario"
    And tengo un OVA listo generado vía API con título único
    When navego a Mis OVAs y localizo el OVA sembrado
    And muevo el OVA sembrado a la papelera
    And borro definitivamente el OVA sembrado desde la papelera
    Then el OVA sembrado ya no aparece en la papelera

  Scenario: Una cuenta nueva ve la papelera vacía
    Given que estoy autenticado con una cuenta recién creada
    When navego a "/papelera"
    Then veo el estado vacío de la papelera
