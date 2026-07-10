# Cubre HU-001 a nivel unit (sin browser/backend): reglas de validación del
# registro extraídas a frontend/src/features/auth/lib/auth-validators.ts
# (mismas que usa register-page y espejo del contrato del backend).
Feature: HU-001 unit — Validaciones del registro

  Scenario: Un nombre real es válido
    Given el nombre completo "Solange Quispe"
    When valido el nombre completo
    Then la validación de nombre es aceptada

  Scenario: Un nombre de solo puntos es rechazado
    Given el nombre completo "..."
    When valido el nombre completo
    Then la validación de nombre es rechazada

  Scenario: Un nombre de solo espacios es rechazado
    Given el nombre completo "   "
    When valido el nombre completo
    Then la validación de nombre es rechazada

  Scenario: Un nombre demasiado corto es rechazado
    Given el nombre completo "Al"
    When valido el nombre completo
    Then la validación de nombre es rechazada

  Scenario: Una contraseña alfanumérica de 8+ caracteres es válida
    Given la contraseña "clave1234"
    When valido la contraseña
    Then la validación de contraseña es aceptada

  Scenario: Una contraseña sin números es rechazada
    Given la contraseña "solopalabras"
    When valido la contraseña
    Then la validación de contraseña es rechazada

  Scenario: Una contraseña corta es rechazada
    Given la contraseña "ab1"
    When valido la contraseña
    Then la validación de contraseña es rechazada
