# Cubre BU-001 a nivel unit con la arquitectura ACTUAL (Angular + cookie
# httpOnly): el mecanismo reactivo de expiración es AuthExpiredBus en
# frontend/src/core/lib/http.ts (401 → notify → AuthService redirige a /login).
# Los escenarios verbatim del bug (BU-001_sesion-expirada.feature) describen la
# arquitectura React anterior y quedan como documentación; el flujo completo en
# browser se cubre en features/e2e/BU-001_sesion-expirada.feature.
Feature: BU-001 unit — Bus de expiración de sesión (AuthExpiredBus)

  Scenario: Un suscriptor recibe la notificación de expiración
    Given un suscriptor registrado en el bus de expiración
    When el bus notifica la expiración de sesión
    Then el suscriptor fue notificado 1 vez

  Scenario: Cancelar la suscripción detiene las notificaciones
    Given un suscriptor registrado en el bus de expiración
    And el suscriptor cancela su suscripción
    When el bus notifica la expiración de sesión
    Then el suscriptor fue notificado 0 veces

  Scenario: Varios suscriptores reciben la misma notificación
    Given 3 suscriptores registrados en el bus de expiración
    When el bus notifica la expiración de sesión
    Then cada suscriptor fue notificado 1 vez
