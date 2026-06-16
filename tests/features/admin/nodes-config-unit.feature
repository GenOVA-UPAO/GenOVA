Feature: Panel de nodos Prometheus — lógica de draft (unit)

  Scenario: Campo rondas visible cuando critico esta activo
    Given un draft de nodos con ova_critic "1"
    Then criticRoundsVisible retorna true

  Scenario: Campo rondas oculto cuando critico esta apagado
    Given un draft de nodos con ova_critic "0"
    Then criticRoundsVisible retorna false

  Scenario: hasUnsavedChanges detecta cambio en flag
    Given un config server con ova_critic "0"
    And un draft modificado con ova_critic "1"
    When comparo draft con config server y rounds 1
    Then hasUnsavedChanges retorna true

  Scenario: hasUnsavedChanges detecta cambio en rounds
    Given un config server con ova_critic "0"
    And un draft sin cambios de flags
    When comparo draft con config server y rounds 2
    Then hasUnsavedChanges retorna true

  Scenario: isVideoResource detecta recurso de video engage
    When verifico si engage recurso id 2 es video
    Then isVideoResource retorna true

  Scenario: isVideoResource descarta recurso no-video
    When verifico si engage recurso id 1 es video
    Then isVideoResource retorna false
