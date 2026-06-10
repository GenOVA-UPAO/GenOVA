# Extraído de sdd/specs/HU-015_ver-editar-perfil.md § Escenarios Gherkin (BDD)
# INC-001: spec usaba formato plano sin Feature/Scenario — convertido a Gherkin estándar.
# Los pasos son verbatim del spec; solo se añadió la estructura Feature/Scenario.
Feature: Ver y editar perfil de usuario
  Como usuario autenticado de la plataforma
  Quiero ver y editar mis datos de perfil
  Para mantener mi información actualizada dentro del sistema

  Scenario: Actualización exitosa del perfil completo
    Given que soy un usuario autenticado
    And me encuentro en la pantalla de perfil "/profile"
    When cambio mi nombre a "Carlos Pérez", mi correo a "carlos.perez@upao.edu.pe", mi código UPAO a "257022", mi sexo a "masculino" y mi teléfono a "+51987285992"
    And hago clic en "Guardar Cambios"
    Then el sistema realiza una llamada PATCH a "/api/users/me" con los nuevos datos
    And el servidor retorna un código de estado 200 con la información del perfil actualizada
    And la interfaz despliega un mensaje de éxito: "¡Perfil actualizado con éxito!"

  Scenario: Intento de cambiar a un correo que ya pertenece a otro usuario
    Given que soy un usuario autenticado con el ID "uuid-user-123" y correo "carlos@correo.com"
    And existe otra cuenta en el sistema registrada bajo "maria@correo.com"
    And me encuentro en la pantalla de perfil "/profile"
    When cambio mi correo electrónico a "maria@correo.com"
    And hago clic en "Guardar Cambios"
    Then el servidor me retorna un código de estado 400 Bad Request
    And la interfaz despliega un mensaje de advertencia: "El correo electrónico ya está en uso por otro usuario."
