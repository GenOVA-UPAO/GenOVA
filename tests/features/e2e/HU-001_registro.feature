# Escenarios EJECUTABLES e2e (Playwright) para HU-001. Complementan la feature
# verbatim tests/features/auth/HU-001_registro.feature (documentación del spec):
# aquí cada paso ejercita el formulario real de /register contra el backend vivo.
# Los escenarios @smoke no crean datos (solo validaciones) y son seguros contra develop.
Feature: HU-001 e2e — Registro de cuenta en el navegador

  Scenario: Registro exitoso completa el alta de la cuenta
    Given que estoy en la página de registro
    When completo el registro con nombre "Estudiante Prueba", correo único y contraseña "clave1234"
    And envío el formulario
    # Con verificación de correo habilitada muestra el aviso; deshabilitada
    # (default) inicia sesión y redirige al dashboard. Ambos son éxito.
    Then el registro se completa con aviso de verificación o sesión iniciada

  @smoke
  Scenario: Nombre sin letras es rechazado por la validación
    Given que estoy en la página de registro
    When completo el registro con nombre "...", correo único y contraseña "clave1234"
    And envío el formulario
    Then debo ver el error de registro "El nombre debe contener al menos una letra."
    And sigo en la página de registro

  @smoke
  Scenario: Contraseña sin números es rechazada por la validación
    Given que estoy en la página de registro
    When completo el registro con nombre "Estudiante Prueba", correo único y contraseña "solopalabras"
    And envío el formulario
    Then debo ver el error de registro "Mínimo 8 caracteres con letras y números."
    And sigo en la página de registro

  @smoke
  Scenario: Correo ya registrado es rechazado por el servidor
    Given que estoy en la página de registro
    When completo el registro con nombre "Estudiante Prueba", correo "user@genova.ai" y contraseña "clave1234"
    And envío el formulario
    Then debo ver el error de registro "El correo ya está registrado."
    And sigo en la página de registro
