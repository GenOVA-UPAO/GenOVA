Feature: Panel de nodos — config de agentes Prometheus (EN-017)

  Scenario: GET retorna nodos y config con defaults cuando no hay DB config
    Given la tabla PlatformConfig no tiene entrada "ova_nodes_config"
    When el admin llama GET /api/admin/nodes-config
    Then la respuesta incluye nodes con al menos 9 nodos
    And config.ova_critic es "0"

  Scenario: PUT guarda flags y GET refleja el cambio
    Given la tabla PlatformConfig está vacía
    When el admin llama PUT /api/admin/nodes-config con ova_critic "1" y ova_reflection_rounds 2
    Then la respuesta incluye config.ova_critic igual a "1"
    And config.ova_reflection_rounds igual a 2

  Scenario: PUT con flag inválido retorna 400
    Given la tabla PlatformConfig está vacía
    When el admin llama PUT /api/admin/nodes-config con ova_critic "invalid"
    Then la respuesta tiene status 400

