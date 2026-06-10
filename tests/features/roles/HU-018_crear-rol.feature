# Extraído verbatim de sdd/specs/HU-018_gestion-roles-crear-rol.md § Escenarios BDD (Gherkin)
Feature: Gestión de Roles — Crear Rol
  Como administrador
  Quiero crear nuevos roles con permisos específicos
  Para definir qué acciones puede realizar cada tipo de usuario

  Background:
    Given que estoy autenticado como usuario con rol "administrador"
    And que los roles del sistema "administrador" y "usuario" ya existen en la base de datos

  Scenario: Acceso al panel de administración
    Given que navego a "/admin"
    Then debo ver el panel de administración con su propio layout
    And debo ver la opción "Gestión de Roles" en el menú del panel

  Scenario: Acceso denegado a usuario sin rol administrador
    Given que estoy autenticado como usuario con rol "usuario"
    When navego a "/admin"
    Then debo ser redirigido al dashboard
    And no debo ver el panel de administración

  Scenario: Ver lista de roles existentes
    Given que estoy en "/admin/roles"
    Then debo ver la lista de roles registrados
    And debo ver al menos los roles "administrador" y "usuario"

  Scenario: Crear un nuevo rol exitosamente
    Given que estoy en "/admin/roles"
    When hago click en "Nuevo rol"
    And ingreso el nombre "docente"
    And selecciono los permisos "create_ova" y "view_ova"
    And envío el formulario
    Then el sistema debe crear el rol y retornar 201
    And el nuevo rol "docente" debe aparecer inmediatamente en la lista

  Scenario: Intentar crear un rol con nombre duplicado
    Given que existe un rol con nombre "docente"
    When intento crear otro rol con el mismo nombre "docente"
    Then el sistema retorna 409
    And debo ver el mensaje "Ya existe un rol con ese nombre"
    And el rol no debe duplicarse en la lista

  Scenario: Intentar crear un rol con nombre vacío
    Given que estoy en el formulario de creación de roles
    When dejo el campo nombre vacío
    And envío el formulario
    Then debo ver un mensaje de error indicando que el nombre es obligatorio
    And el formulario no debe enviarse al backend
