# Extraído verbatim de sdd/bugs/BU-002_cuenta-rol-cambia-navegacion.md § Escenarios BDD.
#
# Scope unit: el harness cucumber-js + happy-dom ejecuta imports directos del
# código de producción y asserts de código fuente (no monta React ni requiere
# backend vivo). Cubre AC#8 (error de red propagado), AC#9 (markLoggedIn →
# clearLocalCache), AC#10/#11 (migración al hook compartido), AC#12 (≤200
# líneas por archivo) y AC#14 (este set de 6 escenarios).
#
# Los AC de backend (#1/#2/#3 contract del endpoint, #4/#5/#6 de la migración
# SQL, #7 de idempotencia del seed) se validan con step_defs/ de pytest contra
# SQLite in-memory — ver backend/tests/step_defs/test_bu002_rol_primario_steps.py
# (referencia; ver spec §14 para los 6 escenarios canónicos).

Feature: Regresión BU-002 — Sesión no cambia de rol o cuenta al navegar

  Scenario: SideBarMenu no re-fetch en navegación
    Given el archivo SidebarMenu.tsx del repositorio
    Then no contiene useEffect con dep [location.pathname] para getCurrentUser
    And el archivo importa "useCurrentUser" desde el modulo "useCurrentUser hook"
    And el archivo no importa "getCurrentUser" desde el modulo "core auth/me"

  Scenario: Navbar consume useCurrentUser
    Given el archivo Navbar.tsx del repositorio
    Then el archivo importa "useCurrentUser" desde el modulo "useCurrentUser hook"
    And el archivo no importa "getCurrentUser" ni "getCachedUser" desde el modulo "core auth/me"

  Scenario: DashboardPage (student) consume useCurrentUser
    Given el archivo DashboardPage.tsx del feature student del repositorio
    Then el archivo importa "useCurrentUser" desde el modulo "useCurrentUser hook"
    And el archivo no define setRole local con useState
    And el archivo no importa "getCurrentUser" desde el modulo "core auth/me"

  Scenario: useCurrentUser cae al cache cuando getCurrentUser falla por red
    Given el archivo useCurrentUser.ts del repositorio
    Then define un fallback getCachedUser en su rama de error de red

  Scenario: getCurrentUser propaga error de red y NO devuelve cache silencioso
    Given BU002: un usuario cacheado en sessionStorage "genova_me"
    And BU002: apiFetch rechaza con un error de red
    When BU002: llamo a getCurrentUser
    Then BU002: la promesa rechaza con un Error
    And BU002: el cache "genova_me" sigue presente en sessionStorage

  Scenario: markLoggedIn invoca clearLocalCache antes del primer fetch a /api/auth/me
    Given BU002: un usuario cacheado en sessionStorage "genova_me"
    When BU002: llamo a markLoggedIn
    Then BU002: el item "genova_me" deja de existir en sessionStorage