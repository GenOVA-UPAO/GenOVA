# Cubre HU-030 a nivel unit (sin browser/backend): lógica de versión
# en la tarjeta OVA y la URL de destino del botón de edición.
Feature: Mis OVAs — acceso workspace + versión (HU-030)

  Scenario: La URL de edición apunta al workspace
    Given un OVA con id "ova-abc-123"
    When se construye la URL de edición
    Then la URL es "/ova/ova-abc-123/workspace"

  Scenario: La tarjeta muestra la versión activa del OVA
    Given un OVA con version_number 2
    When se renderiza la etiqueta de versión
    Then la etiqueta de versión es "v2"

  Scenario: Sin versión activa no se muestra etiqueta
    Given un OVA sin version_number
    When se renderiza la etiqueta de versión
    Then no hay etiqueta de versión
