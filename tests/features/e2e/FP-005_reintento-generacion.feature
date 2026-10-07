# Reintento de una generación fallida. El marcador «[fallo-e2e]» en el prompt hace
# que la PRIMERA generación falle con LLM_FAKE=1 (ver fake_invoke.py); el reintento
# funciona. Requiere backend con LLM_FAKE=1.
Feature: FP-005 e2e — Reintentar una generación fallida

  Scenario: Un OVA con la generación fallida se recupera con «Reintentar generación»
    Given que estoy autenticado como usuario con rol "usuario"
    And tengo un OVA cuya generación falló vía API
    When navego a Mis OVAs y localizo el OVA sembrado
    Then la card del OVA sembrado ofrece «Reintentar generación» y está en estado de error
    When reintento la generación del OVA sembrado
    Then la card del OVA sembrado queda en estado «Listo»
