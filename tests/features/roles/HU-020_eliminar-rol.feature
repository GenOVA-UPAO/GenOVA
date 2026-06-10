# Extraído verbatim de sdd/specs/HU-020_gestion-roles-eliminar-rol.md § Escenarios BDD (Gherkin)
Feature: Gestión de Roles — Eliminar Rol
  Como administrador
  Quiero eliminar roles obsoletos
  Para mantener el orden de perfiles y accesos del sistema

  Background:
    Given que estoy autenticado como usuario con rol "administrador"
    And que existe un rol personalizado con ID "111" y nombre "auxiliar"

  Scenario: Bloqueo de eliminación para roles de sistema
    Given que estoy en la pantalla "/admin/roles"
    Then no debo ver el botón "Eliminar" para el rol "administrador"
    And no debo ver el botón "Eliminar" para el rol "usuario"
    And en su lugar debe figurar el texto "Sistema"

  Scenario: Eliminar un rol sin usuarios asignados
    Given que el rol "auxiliar" tiene 0 usuarios vinculados
    And que estoy en la pantalla "/admin/roles"
    When hago click en el botón "Eliminar" de "auxiliar"
    Then debo ver un modal de confirmación simple
    And debo ver la advertencia de que la acción es irreversible
    When hago click en "Confirmar eliminación"
    Then el sistema debe eliminar el rol retornando 204
    And el rol "auxiliar" debe desaparecer de la tabla local de inmediato

  Scenario: Intentar eliminar un rol con usuarios sin especificar reasignación
    Given que el rol "auxiliar" tiene 3 usuarios asignados
    When envío un request directo DELETE a "/api/roles/111" sin query parameters
    Then el sistema retorna un código 409
    And responde con el mensaje "El rol tiene usuarios asignados"

  Scenario: Eliminar un rol con usuarios especificando reasignación
    Given que el rol "auxiliar" tiene 3 usuarios asignados
    And que estoy en la pantalla "/admin/roles"
    When hago click en el botón "Eliminar" de "auxiliar"
    Then debo ver un modal indicando "Este rol tiene 3 usuarios asignados"
    And debo ver un selector de roles para reasignación
    When selecciono el rol "usuario" como destino
    And hago click en "Reasignar y eliminar"
    Then el sistema debe actualizar la tabla user_roles migrando los 3 usuarios a "usuario"
    And debe eliminar el rol "auxiliar" de la base de datos
    And el rol "auxiliar" debe desaparecer de la tabla de inmediato
