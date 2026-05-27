# Extraído de specs/HU-016_cambiar-contrasena.md § Escenarios Gherkin (BDD)
# INC-001: spec usaba formato plano sin Feature/Scenario — convertido a Gherkin estándar.
# Los pasos son verbatim del spec; solo se añadió la estructura Feature/Scenario.
Feature: Cambiar contraseña desde el perfil
  Como usuario autenticado de la plataforma
  Quiero poder cambiar mi contraseña desde la pantalla de perfil
  Para mantener la seguridad de mi cuenta de forma proactiva

  Scenario: Cambio de contraseña exitoso
    Given que soy un usuario autenticado
    And me encuentro en la pantalla de perfil "/profile"
    When ingreso mi contraseña actual "PasswordOld1"
    And coloco mi nueva contraseña "PasswordNew2" y su confirmación "PasswordNew2"
    And hago clic en "Actualizar Contraseña"
    Then el sistema realiza una llamada POST a "/api/users/me/change-password"
    And el servidor retorna un código de estado 200 OK
    And la interfaz despliega un mensaje verde: "¡Contraseña actualizada con éxito!"
    And todos los campos del formulario de contraseña se vacían automáticamente

  Scenario: Intento con contraseña actual incorrecta
    Given que soy un usuario autenticado
    And me encuentro en la pantalla de perfil "/profile"
    When ingreso una contraseña actual errónea como "Incorrecta123"
    And coloco mi nueva contraseña "PasswordNew2" y su confirmación "PasswordNew2"
    And hago clic en "Actualizar Contraseña"
    Then el servidor me retorna un código de estado 400 Bad Request
    And la interfaz despliega una alerta de error: "La contraseña actual ingresada es incorrecta."
    And los campos de texto mantienen sus valores intactos para corrección del usuario

  Scenario: Error de formato en la nueva contraseña
    Given que soy un usuario autenticado
    And me encuentro en la pantalla de perfil "/profile"
    When ingreso una contraseña nueva débil como "123"
    Then el botón "Actualizar Contraseña" se muestra deshabilitado o el frontend muestra errores de validación
    And previene la llamada al servidor hasta cumplir las políticas de seguridad
