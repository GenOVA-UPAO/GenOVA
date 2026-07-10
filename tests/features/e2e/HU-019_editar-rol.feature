# Escenarios EJECUTABLES e2e para HU-019 (editar rol). La feature verbatim vive
# en tests/features/roles/HU-019_editar-rol.feature. Los escenarios que escriben
# datos usan nombres únicos y limpian creando/eliminando su propio rol.
Feature: HU-019 e2e — Editar rol desde el panel de administración

  Background:
    Given que estoy autenticado como usuario con rol "administrador"
    And que estoy en "/admin/roles"
    And debo ver la lista de roles registrados

  @smoke
  Scenario: Los roles de sistema no son editables
    Then los roles del sistema muestran la etiqueta "Sistema"

  Scenario: Editar un rol personalizado renombrándolo
    Given creo un rol único desde la interfaz
    When renombro ese rol añadiendo el sufijo "-edit"
    Then el rol renombrado aparece en la lista
    And elimino ese rol desde la interfaz
