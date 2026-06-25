# Extraído verbatim de sdd/specs/HU-001_registro-cuenta-usuario.md § Escenarios BDD (Gherkin)
Feature: Registro de cuenta de usuario
  Como estudiante
  Quiero registrarme con email y contraseña
  Para acceder a mi perfil y OVAs

  Scenario: Registro exitoso con credenciales válidas
    Given que estoy en la página de registro
    When ingreso un correo válido y una contraseña alfanumérica de mínimo 8 caracteres
    And envío el formulario
    Then el sistema debe crear la cuenta sin verificar
    And los campos university_id, gender y phone_number deben crearse como NULL
    And debo ver un aviso para verificar mi correo
    And no debo iniciar sesión hasta verificar el correo

  Scenario: Registro fallido por email duplicado
    Given que el correo "estudiante@upao.edu" ya está registrado
    When intento registrarme con ese correo
    Then debo ver un mensaje indicando que el correo ya existe
    And no debo ser redirigido al dashboard
