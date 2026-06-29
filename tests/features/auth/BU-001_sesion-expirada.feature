# Extraído verbatim de sdd/bugs/BU-001_sesion-expirada-no-redirige.md § Escenarios BDD
# Cobertura de regresión: 4 escenarios unitarios + 1 end-to-end de flujo
# reactivo de AuthGate / useCurrentUser / clearCurrentUser + LoginPage.

Feature: Regresión BU-001 — Sesión expirada redirige a inicio de sesión

  Scenario: clearCurrentUser emite auth:expired y purga sessionStorage
    Given un usuario cacheado en sessionStorage "genova_me"
    When llamo a clearCurrentUser
    Then se emite el evento "auth:expired" en window
    And el item "genova_me" deja de existir en sessionStorage

  Scenario: clearLocalCache purga sin emitir auth:expired
    Given un usuario cacheado en sessionStorage "genova_me"
    When llamo a clearLocalCache
    Then NO se emite el evento "auth:expired" en window
    And el item "genova_me" deja de existir en sessionStorage

  Scenario: markLoggedIn invoca clearLocalCache
    Given un usuario cacheado en sessionStorage "genova_me"
    And establezco "genova_session" a "0" en localStorage
    When llamo a markLoggedIn
    Then "genova_session" vale "1" en localStorage
    And el item "genova_me" deja de existir en sessionStorage

  Scenario: isLoggedIn es helper optimistic (no consulta backend)
    Given establezco "genova_session" a "1" en localStorage
    When consulto isLoggedIn
    Then el resultado es true
    And la respuesta se calculo sin llamadas de red

  Scenario: Sesión expirada redirige a /login y muestra mensaje informativo
    Given un usuario autenticado cuya sesión JWT ha expirado
    And el AuthGate emitió auth:expired y marcó la flag de sesión expirada
    When LoginPage consume la flag de sesión expirada
    Then consumeSessionExpiredFlag devuelve true la primera vez
    And consumeSessionExpiredFlag devuelve false la segunda vez
    And el item "genova:session_expired" deja de existir en sessionStorage
    And LoginPage importa consumeSessionExpiredFlag desde sessionExpiredFlag
