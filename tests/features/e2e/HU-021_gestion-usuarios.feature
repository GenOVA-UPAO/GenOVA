# Escenarios EJECUTABLES e2e para HU-021 (gestión de usuarios). La feature
# verbatim vive en tests/features/roles/HU-021_gestion-usuarios.feature; el cambio
# real de rol y los restablecimientos se cubren en backend BDD para no mutar las
# cuentas seed compartidas.
Feature: HU-021 e2e — Gestión de usuarios del panel de administración

  @smoke
  Scenario: El panel lista usuarios y permite buscar por email
    Given que estoy autenticado como usuario con rol "administrador"
    When navego a "/admin"
    Then veo la pantalla de gestión de usuarios
    When busco el usuario "user@genova.ai" en la gestión de usuarios
    Then la lista de usuarios muestra a "user@genova.ai"
