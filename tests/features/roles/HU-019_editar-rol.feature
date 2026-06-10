# Extraído verbatim de sdd/specs/HU-019_gestion-roles-editar-rol.md § Escenarios BDD (Gherkin)
Feature: Gestión de Roles — Editar Rol
  Como administrador
  Quiero editar el nombre y permisos de un rol existente
  Para ajustar el control de acceso sin crear nuevos roles

  Background:
    Given que estoy autenticado como usuario con rol "administrador"
    And que existe un rol personalizado con ID "123" y nombre "docente"

  Scenario: Precarga de datos en el modal de edición
    Given que estoy en la pantalla "/admin/roles"
    When hago click en el botón "Editar" del rol "docente"
    Then debo ver abrirse el modal "Editar Rol"
    And el campo de texto "Nombre del rol" debe mostrar "docente"
    And los permisos asignados a "docente" deben estar pre-seleccionados

  Scenario: Modificación exitosa del rol
    Given que tengo el modal de edición del rol "docente" abierto
    When cambio el nombre a "instructor"
    And selecciono el permiso "export_ova"
    And hago click en "Guardar cambios"
    Then el sistema debe actualizar el rol en la base de datos y retornar 200
    And el modal debe cerrarse automáticamente
    And el rol "instructor" con sus nuevos permisos debe listarse inmediatamente en la tabla

  Scenario: Bloqueo de edición para roles de sistema
    Given que estoy en la lista de roles
    Then para la fila "administrador" no debe mostrarse el botón "Editar"
    And para la fila "usuario" no debe mostrarse el botón "Editar"
    And en su lugar debe aparecer el texto descriptivo "Sistema"

  Scenario: Nombre duplicado al intentar editar
    Given que existe otro rol con nombre "supervisor"
    And que tengo abierto el modal de edición del rol "docente"
    When cambio el nombre del rol a "supervisor"
    And hago click en "Guardar cambios"
    Then el sistema debe retornar un código 409
    And debo ver el mensaje de error "Ya existe un rol con ese nombre"
    And el modal debe permanecer abierto
