# Escenarios EJECUTABLES e2e para HU-010 (layout y navegación). La feature
# verbatim vive en tests/features/layout/HU-010_layout.feature.
Feature: HU-010 e2e — Layout y navegación principal

  @smoke
  Scenario: El login renderiza la pantalla de inicio de sesión
    Given que estoy en la página de login
    Then debo visualizar la pantalla de inicio de sesión

  @smoke
  Scenario: Las rutas protegidas comparten Navbar y Sidebar
    Given que estoy autenticado como usuario con rol "usuario"
    When navego a "/dashboard"
    Then debo ver la navegación principal completa
    When navego a "/crear"
    Then veo la pantalla "Crear nuevo OVA"
