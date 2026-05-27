# Extraído verbatim de specs/HU-008_inicio-sesion-credenciales.md § Escenarios BDD (Gherkin)
Feature: Inicio de sesión con credenciales
  Como estudiante
  Quiero iniciar sesión con mi correo y contraseña
  Para acceder a la plataforma y mis proyectos

  Scenario: Login exitoso
    Given que estoy en la página de login
    When ingreso un correo registrado y contraseña válida
    And envío el formulario
    Then debo recibir un JWT con expiración de 24 horas
    And debo ser redirigido al dashboard

  Scenario: Credenciales inválidas
    Given que estoy en la página de login
    When ingreso un correo o contraseña inválidos
    And envío el formulario
    Then debo recibir un error descriptivo
    And no debo acceder al dashboard

  Scenario: Bloqueo tras intentos fallidos
    Given que realizo 5 intentos fallidos consecutivos
    When intento iniciar sesión nuevamente
    Then la cuenta debe quedar bloqueada por 15 minutos
    And debo recibir un mensaje indicando el bloqueo

  Scenario: Token expirado
    Given que tengo un token expirado en el cliente
    When intento acceder a una ruta protegida
    Then debo ser redirigido automáticamente al login

  Scenario: Cerrar sesión
    Given que tengo una sesión activa
    When hago click en "Cerrar sesión"
    Then el token debe eliminarse del cliente
    And debo ser redirigido al login
