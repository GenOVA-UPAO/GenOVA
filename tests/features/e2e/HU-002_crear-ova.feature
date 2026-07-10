# Escenarios EJECUTABLES e2e para HU-002 (crear OVA desde prompt). La feature
# verbatim vive en tests/features/ova/HU-002_crear-ova.feature. El escenario de
# generación completa requiere backend con LLM_FAKE=1 (CI) — no corre en @smoke.
Feature: HU-002 e2e — Crear OVA desde prompt

  @smoke
  Scenario: El botón Generar permanece deshabilitado sin prompt ni recursos
    Given que estoy autenticado como usuario con rol "usuario"
    When navego a "/crear"
    Then veo la pantalla "Crear nuevo OVA"
    And el botón "Generar OVA" está deshabilitado

  Scenario: Generación completa desde el formulario hasta el workspace
    Given que estoy autenticado como usuario con rol "usuario"
    When navego a "/crear"
    And escribo un prompt válido sobre "Redes neuronales para principiantes"
    And configuro recursos en al menos dos fases
    And inicio la generación del OVA
    Then la generación redirige al workspace del OVA
    And el workspace muestra el botón de descarga SCORM
