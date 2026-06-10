# Cubre HU-022 a nivel unit (sin browser/backend): el mapeo job→viewmodel y la
# selección de recursos fallidos que viven en frontend/src/lib/ovaJobViewModel.js.
Feature: Recuperación de recursos parciales — viewmodel (HU-022)

  Scenario: El viewmodel mapea estados backend a estados de UI
    Given un job con recursos en estados "done, error, running, pending"
    When se construye el viewmodel de recursos
    Then los estados de UI son "check, X, generando, pendiente" en orden
    And solo el recurso en error es seleccionable

  Scenario: El recurso fallido conserva su Error ID y etiqueta del catálogo
    Given un recurso "error" con error_id "8f3a-c1" del tipo "Diagrama"
    When se construye el viewmodel de recursos
    Then ese recurso muestra la etiqueta "Diagrama" y el error_id "8f3a-c1"

  Scenario: Seleccionar todos los fallidos toma solo los recursos en error
    Given un job con dos recursos en error y uno done
    When se piden los ids de los recursos fallidos
    Then se obtienen exactamente los dos recursos en error

  Scenario: La selección se depura cuando un fallido pasa a done
    Given una selección con un id que ya quedó en estado done
    When se depura la selección contra el viewmodel
    Then ese id ya no está en la selección

  Scenario: Fallo total se detecta cuando ningún recurso quedó done
    Given un job terminado en error sin recursos done
    When se evalúa el resultado del job
    Then el resultado indica fallo total
    And no hay recursos done para previsualizar
