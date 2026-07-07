# Escenario EJECUTABLE e2e para HU-015 (ver perfil). La feature verbatim vive en
# tests/features/auth/HU-015_perfil.feature. La edición del perfil NO se ejercita
# e2e para no mutar las cuentas seed compartidas (cubierta en backend BDD).
Feature: HU-015 e2e — Ver perfil de usuario

  @smoke
  Scenario: El perfil muestra los datos del usuario autenticado
    Given que estoy autenticado como usuario con rol "usuario"
    When navego a "/profile"
    Then la página muestra el texto "user@genova.ai"
