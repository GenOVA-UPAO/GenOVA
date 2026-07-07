# Escenario EJECUTABLE e2e para HU-020 (eliminar rol). La feature verbatim vive
# en tests/features/roles/HU-020_eliminar-rol.feature; la reasignación de usuarios
# se cubre en backend BDD (test_roles_steps.py).
Feature: HU-020 e2e — Eliminar rol desde el panel de administración

  Scenario: Eliminar un rol personalizado sin usuarios
    Given que estoy autenticado como usuario con rol "administrador"
    And que estoy en "/admin/roles"
    And debo ver la lista de roles registrados
    And creo un rol único desde la interfaz
    When elimino ese rol desde la interfaz
    Then ese rol desaparece de la lista
