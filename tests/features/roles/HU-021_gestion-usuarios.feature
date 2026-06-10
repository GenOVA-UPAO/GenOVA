# Extraído de sdd/specs/HU-021_gestion-roles-asignar-rol-usuario.md § Escenarios Gherkin
# INC-001: La spec usa formato informal (Dado/Cuando/Entonces sin wrapper Feature/Scenario).
#          Convertido a Gherkin estándar.
# INC-004: El contrato API de /api/users/{id}/reset-password-whatsapp en la spec expone
#          otp_code en la respuesta HTTP. Esto viola la política de seguridad del proyecto
#          (los tokens/OTPs nunca cruzan el límite HTTP). Escenario 5 corregido para
#          esperar solo wa_url. Ver docs/tasks/TA-BDD-incompatibilidades.md.
Feature: Gestión de Usuarios y Roles

  Background:
    Given que estoy autenticado como usuario con rol "administrador"
    And me encuentro en la pantalla de gestión de usuarios "/admin/users"

  Scenario: Asignación exitosa de rol a usuario
    When cambio el selector de rol del usuario "user@genova.ai" de "usuario" a "docente"
    Then el sistema realiza una llamada PATCH a "/api/users/{id}/role" con el ID del rol "docente"
    And el servidor retorna un código de estado 200 con la información del usuario actualizada
    And el estado local en el frontend refleja el nuevo rol "docente" en su fila

  Scenario: Administrador no puede cambiar su propio rol
    Given que soy el administrador autenticado con ID "uuid-admin-123" y correo "admin@genova.ai"
    When busco mi propia fila en la lista de usuarios
    Then el selector de rol correspondiente a mi fila se muestra deshabilitado
    And el menú de acciones para mi usuario está deshabilitado
    When intento enviar manualmente una petición PATCH a "/api/users/uuid-admin-123/role"
    Then el backend retorna un código de estado 400 Bad Request

  Scenario: Prevención de escalada de privilegios por rol "coordinador"
    Given que estoy autenticado con un rol "coordinador" que posee el permiso "manage_users"
    And existe un usuario "admin@genova.ai" con el rol "administrador"
    When intento abrir el modal de edición o cambiar el rol de "admin@genova.ai" desde la interfaz
    Then las acciones están deshabilitadas
    When intento enviar manualmente un PATCH al endpoint para cambiar su rol
    Then el backend responde con 403 Forbidden indicando "No puedes modificar a un usuario administrador"

  Scenario: Restablecimiento de contraseña por correo
    When hago clic en "Restablecer por Correo" del usuario "estudiante@upao.edu.pe"
    Then el backend genera un token de restablecimiento único
    And el servidor envía un correo electrónico automático a "estudiante@upao.edu.pe" desde "soporte.genova.upao@gmail.com"
    And el frontend muestra una notificación de éxito indicando que el correo fue enviado

  Scenario: Restablecimiento de contraseña por WhatsApp
    Given el usuario "estudiante@upao.edu.pe" tiene teléfono registrado
    When hago clic en "Restablecer por WhatsApp" del usuario "estudiante@upao.edu.pe"
    Then el backend genera un OTP internamente y construye el enlace de WhatsApp
    And el servidor retorna solo la wa_url con el mensaje prellenado
    And el frontend abre el enlace de WhatsApp en una nueva pestaña
    And el otp_code no se expone en la respuesta HTTP
