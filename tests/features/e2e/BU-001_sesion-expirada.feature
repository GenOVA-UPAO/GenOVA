# Escenario EJECUTABLE e2e para BU-001 (regresión). La variante unitaria vive en
# tests/features/auth/BU-001_sesion-expirada.feature; aquí se verifica el flujo
# real en browser: cookie httpOnly eliminada → ruta protegida redirige a /login.
Feature: BU-001 e2e — Sesión expirada redirige a inicio de sesión

  @smoke
  Scenario: Al expirar la sesión una ruta protegida redirige al login
    Given que tengo una sesión activa
    When mi sesión expira
    And navego a "/mis-ovas"
    Then debo ser redirigido automáticamente al login
