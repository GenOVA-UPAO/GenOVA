# Metadatos (licencia) y tema del paquete desde «Editar título y descripción» de Mis OVAs.
# Requiere backend con LLM_FAKE=1.
Feature: FP-006 e2e — Licencia y tema del paquete persisten

  Scenario: Cambiar la licencia y el tema del paquete y recargar conserva los valores
    Given que estoy autenticado como usuario con rol "usuario"
    And tengo un OVA listo generado vía API con título único
    When navego a Mis OVAs y localizo el OVA sembrado
    And abro los metadatos del OVA sembrado
    And elijo la licencia "CC BY-NC-SA 4.0" y el tema del paquete "Oscuro"
    And guardo los metadatos
    And recargo Mis OVAs y localizo el OVA sembrado
    And abro los metadatos del OVA sembrado
    Then los metadatos muestran la licencia "CC BY-NC-SA 4.0" y el tema del paquete "Oscuro"
    And la card del OVA sembrado resume la licencia "CC BY-NC-SA 4.0"
